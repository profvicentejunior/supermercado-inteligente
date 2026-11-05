const router = require('express').Router();
const { dbOLTP } = require('../config/database');

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function redirectError(res, message) {
  return res.redirect('/admin/ai-governance?erro=' + encodeURIComponent(message));
}

router.get('/', async (req, res) => {
  try {
    const prompts = await dbOLTP('ai_prompts as p')
      .leftJoin('ai_prompt_versions as v', function () {
        this.on('v.prompt_id', '=', 'p.id')
          .andOn('v.version', '=', 'p.current_version');
      })
      .select(
        'p.id', 'p.name', 'p.slug', 'p.description', 'p.category',
        'p.status', 'p.current_version', 'v.content as current_content'
      )
      .orderBy('p.updated_at', 'desc')
      .orderBy('p.created_at', 'desc');

    const agents = await dbOLTP('ai_agents as a')
      .leftJoin('ai_prompts as p', 'p.id', 'a.prompt_id')
      .leftJoin('ai_prompt_versions as v', 'v.id', 'a.prompt_version_id')
      .select(
        'a.*',
        'p.name as prompt_name',
        'v.version as prompt_version'
      )
      .orderBy('a.created_at', 'desc');

    const evaluations = await dbOLTP('ai_agent_evaluations as e')
      .join('ai_agents as a', 'a.id', 'e.agent_id')
      .leftJoin('ai_prompt_versions as v', 'v.id', 'e.prompt_version_id')
      .select('e.*', 'a.name as agent_name', 'v.version as prompt_version')
      .orderBy('e.created_at', 'desc')
      .limit(30);

    res.render('admin/ai-governance', {
      title: 'Governança de IA',
      prompts,
      agents,
      evaluations,
      erro: req.query.erro || null,
      sucesso: req.query.sucesso || null
    });
  } catch (error) {
    console.error('[AI Governance] Erro ao carregar:', error);
    res.status(500).send('Erro ao carregar o módulo de governança de IA.');
  }
});

// Criação de prompt e primeira versão.
router.post('/prompts', async (req, res) => {
  const { name, description, category, content } = req.body;

  if (!name?.trim() || !content?.trim()) {
    return redirectError(res, 'Informe o nome e o conteúdo do prompt.');
  }

  const slug = slugify(name);
  if (!slug) return redirectError(res, 'Nome inválido para o prompt.');

  try {
    await dbOLTP.transaction(async trx => {
      const [promptId] = await trx('ai_prompts').insert({
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        category: category?.trim() || null,
        status: 'active',
        current_version: 1
      });

      await trx('ai_prompt_versions').insert({
        prompt_id: promptId,
        version: 1,
        content: content.trim(),
        change_notes: 'Versão inicial',
        created_by: 'admin'
      });
    });

    res.redirect('/admin/ai-governance?sucesso=' + encodeURIComponent('Prompt criado com sucesso.'));
  } catch (error) {
    console.error('[AI Governance] Erro ao criar prompt:', error);
    redirectError(res, error.code === 'ER_DUP_ENTRY'
      ? 'Já existe um prompt com esse nome.'
      : 'Não foi possível criar o prompt.');
  }
});

// Atualização dos metadados do prompt, sem alterar seu histórico.
router.post('/prompts/:id', async (req, res) => {
  const { name, description, category, status } = req.body;

  if (!name?.trim()) return redirectError(res, 'O nome do prompt é obrigatório.');

  try {
    const updated = await dbOLTP('ai_prompts')
      .where({ id: req.params.id })
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        category: category?.trim() || null,
        status: status === 'inactive' ? 'inactive' : 'active',
        updated_at: dbOLTP.fn.now()
      });

    if (!updated) return redirectError(res, 'Prompt não encontrado.');

    res.redirect('/admin/ai-governance?sucesso=' + encodeURIComponent('Dados do prompt atualizados.'));
  } catch (error) {
    console.error('[AI Governance] Erro ao atualizar prompt:', error);
    redirectError(res, 'Não foi possível atualizar o prompt.');
  }
});

// Nova versão: as versões anteriores permanecem preservadas.
router.post('/prompts/:id/versions', async (req, res) => {
  const { content, change_notes } = req.body;

  if (!content?.trim()) return redirectError(res, 'O conteúdo da nova versão é obrigatório.');

  try {
    await dbOLTP.transaction(async trx => {
      const prompt = await trx('ai_prompts')
        .where({ id: req.params.id })
        .forUpdate()
        .first();

      if (!prompt) throw new Error('PROMPT_NOT_FOUND');

      const version = Number(prompt.current_version) + 1;

      await trx('ai_prompt_versions').insert({
        prompt_id: prompt.id,
        version,
        content: content.trim(),
        change_notes: change_notes?.trim() || null,
        created_by: 'admin'
      });

      await trx('ai_prompts')
        .where({ id: prompt.id })
        .update({
          current_version: version,
          updated_at: trx.fn.now()
        });
    });

    res.redirect('/admin/ai-governance?sucesso=' + encodeURIComponent('Nova versão registrada.'));
  } catch (error) {
    console.error('[AI Governance] Erro ao versionar prompt:', error);
    redirectError(res, error.message === 'PROMPT_NOT_FOUND'
      ? 'Prompt não encontrado.'
      : 'Não foi possível criar a nova versão.');
  }
});

// Cadastro de agente.
router.post('/agents', async (req, res) => {
  const {
    name, description, prompt_id, prompt_version_id,
    provider, model, temperature, max_tokens, configuration
  } = req.body;

  if (!name?.trim()) return redirectError(res, 'Informe o nome do agente.');

  const slug = slugify(name);
  const temp = Number(temperature ?? 0.3);
  const tokens = max_tokens ? Number(max_tokens) : null;

  if (!Number.isFinite(temp) || temp < 0 || temp > 2) {
    return redirectError(res, 'Temperatura deve estar entre 0 e 2.');
  }

  if (tokens !== null && (!Number.isInteger(tokens) || tokens < 1)) {
    return redirectError(res, 'Limite de tokens inválido.');
  }

  let config = {};
  if (configuration?.trim()) {
    try {
      config = JSON.parse(configuration);
      if (!config || Array.isArray(config) || typeof config !== 'object') {
        throw new Error('Objeto esperado');
      }
    } catch {
      return redirectError(res, 'A configuração deve ser um JSON válido.');
    }
  }

  try {
    await dbOLTP.transaction(async trx => {
      const promptId = prompt_id ? Number(prompt_id) : null;
      let versionId = null;

      if (promptId) {
        const prompt = await trx('ai_prompts')
          .where({ id: promptId })
          .forUpdate()
          .first();

        if (!prompt) throw new Error('INVALID_PROMPT_VERSION');

        let versionNumber = Number(prompt.current_version);

        if (prompt_version_id) {
          const selectedVersion = String(prompt_version_id).split(':');

          if (selectedVersion.length === 2) {
            if (Number(selectedVersion[0]) !== promptId) {
              throw new Error('INVALID_PROMPT_VERSION');
            }
            versionNumber = Number(selectedVersion[1]);
          } else {
            versionNumber = Number(prompt_version_id);
          }
        }

        if (!Number.isInteger(versionNumber) || versionNumber < 1) {
          throw new Error('INVALID_PROMPT_VERSION');
        }

        const version = await trx('ai_prompt_versions')
          .where({ prompt_id: promptId, version: versionNumber })
          .first();

        if (!version) throw new Error('INVALID_PROMPT_VERSION');
        versionId = version.id;
      } else if (prompt_version_id) {
        throw new Error('INVALID_PROMPT_VERSION');
      }

      await trx('ai_agents').insert({
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        prompt_id: promptId,
        prompt_version_id: versionId,
        provider: provider || 'not_configured',
        model: model?.trim() || null,
        temperature: temp,
        max_tokens: tokens,
        configuration: JSON.stringify(config),
        status: 'inactive'
      });
    });

    res.redirect('/admin/ai-governance?sucesso=' + encodeURIComponent('Agente cadastrado como inativo.'));
  } catch (error) {
    console.error('[AI Governance] Erro ao criar agente:', error);
    redirectError(res, error.message === 'INVALID_PROMPT_VERSION'
      ? 'A versão selecionada não pertence ao prompt informado.'
      : error.code === 'ER_DUP_ENTRY'
        ? 'Já existe um agente com esse nome.'
        : 'Não foi possível cadastrar o agente.');
  }
});

// Ativação e desativação.
router.post('/agents/:id/toggle', async (req, res) => {
  try {
    const agent = await dbOLTP('ai_agents').where({ id: req.params.id }).first();

    if (!agent) return redirectError(res, 'Agente não encontrado.');

    const status = agent.status === 'active' ? 'inactive' : 'active';

    await dbOLTP('ai_agents')
      .where({ id: agent.id })
      .update({ status, updated_at: dbOLTP.fn.now() });

    res.redirect('/admin/ai-governance?sucesso=' + encodeURIComponent(
      status === 'active' ? 'Agente ativado.' : 'Agente desativado.'
    ));
  } catch (error) {
    console.error('[AI Governance] Erro ao alterar agente:', error);
    redirectError(res, 'Não foi possível alterar o status do agente.');
  }
});


// Registro de avaliação de agente.
router.post('/agents/:id/evaluations', async (req, res) => {
  const { evaluation_type, score, result, input_data, output_data, notes } = req.body;
  const types = ['functional', 'quality', 'security', 'manual'];
  const results = ['passed', 'failed', 'pending'];

  if (!types.includes(evaluation_type)) {
    return redirectError(res, 'Tipo de avaliação inválido.');
  }

  if (!results.includes(result)) {
    return redirectError(res, 'Resultado inválido.');
  }

  const parsedScore = score === '' || score == null ? null : Number(score);

  if (parsedScore !== null &&
      (!Number.isFinite(parsedScore) || parsedScore < 0 || parsedScore > 100)) {
    return redirectError(res, 'A nota deve estar entre 0 e 100.');
  }

  try {
    const agent = await dbOLTP('ai_agents')
      .where({ id: req.params.id })
      .first();

    if (!agent) return redirectError(res, 'Agente não encontrado.');

    await dbOLTP('ai_agent_evaluations').insert({
      agent_id: agent.id,
      prompt_version_id: agent.prompt_version_id || null,
      evaluation_type,
      score: parsedScore,
      result,
      input_data: input_data?.trim() || null,
      output_data: output_data?.trim() || null,
      notes: notes?.trim() || null
    });

    res.redirect('/admin/ai-governance?sucesso=' +
      encodeURIComponent('Avaliação registrada com sucesso.'));
  } catch (error) {
    console.error('[AI Governance] Erro ao registrar avaliação:', error);
    redirectError(res, 'Não foi possível registrar a avaliação.');
  }
});


// Execução real do Analista Inteligente de Estoque com Gemini.
router.post('/agents/:id/run-stock-analysis', async (req, res) => {
  const startedAt = Date.now();

  try {
    const agent = await dbOLTP('ai_agents')
      .where({ id: req.params.id })
      .first();

    if (!agent) return res.status(404).send('Agente não encontrado.');
    if (agent.status !== 'active') {
      return res.status(400).send('Ative o agente antes de executá-lo.');
    }
    if (agent.provider !== 'google') {
      return res.status(400).send('Configure o provedor Google neste agente.');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).send(
        'GEMINI_API_KEY não configurada. Adicione a chave nas variáveis de ambiente.'
      );
    }

    const promptVersion = agent.prompt_version_id
      ? await dbOLTP('ai_prompt_versions')
          .where({ id: agent.prompt_version_id }).first()
      : null;

    const products = await dbOLTP('inventory as i')
      .join('products as p', 'p.id', 'i.product_id')
      .where('p.active', 1)
      .select(
        'p.id', 'p.sku', 'p.name', 'p.unit',
        'i.quantity', 'i.minimum_quantity'
      )
      .orderBy('i.quantity', 'asc')
      .limit(100);

    const lowStock = products.filter(
      p => Number(p.quantity) <= Number(p.minimum_quantity)
    );

    const data = {
      totalProductsAnalyzed: products.length,
      productsBelowOrAtMinimum: lowStock.length,
      products: products.map(p => ({
        sku: p.sku,
        name: p.name,
        unit: p.unit,
        quantity: Number(p.quantity),
        minimumQuantity: Number(p.minimum_quantity),
        needsReplenishment: Number(p.quantity) <= Number(p.minimum_quantity)
      }))
    };

    const model = agent.model || 'gemini-2.5-flash';
    const prompt = promptVersion?.content ||
      'Você é um analista de estoque de supermercado. Analise os dados reais, identifique riscos de ruptura, priorize reposições e recomende ações objetivas. Não invente dados.';

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/interactions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          model,
          store: false,
          input: prompt + '\n\nAnalise estes dados reais do estoque:\n' + JSON.stringify(data)
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || `Gemini HTTP ${response.status}`);
    }

    const analysis = (result.steps || [])
      .filter(step => step.type === 'model_output')
      .flatMap(step => step.content || [])
      .filter(part => part.type === 'text')
      .map(part => part.text || '')
      .join('\n');

    if (!analysis) throw new Error('Gemini não retornou conteúdo.');

    const usage = result.usage || {};
    const inputTokens = Number(usage.total_input_tokens || 0);
    const outputTokens = Number(usage.total_output_tokens || 0);
    const totalTokens = Number(usage.total_tokens || inputTokens + outputTokens);
    const durationMs = Date.now() - startedAt;

    await dbOLTP('ai_agent_usage').insert({
      agent_id: agent.id,
      prompt_version_id: agent.prompt_version_id || null,
      provider: 'google',
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      estimated_cost: 0,
      currency: 'USD',
      source: 'admin',
      status: 'completed',
      metadata: JSON.stringify({
        analysis,
        productsAnalyzed: products.length,
        lowStockCount: lowStock.length,
        durationMs
      })
    });

    console.log('[AI Agent]', JSON.stringify({
      agent: agent.name,
      model,
      status: 'completed',
      durationMs,
      inputTokens,
      outputTokens,
      totalTokens
    }));

    return res.render('admin/ai-analysis-result', {
      title: 'Análise inteligente de estoque',
      agent,
      analysis,
      productsAnalyzed: products.length,
      lowStockCount: lowStock.length,
      durationMs,
      inputTokens,
      outputTokens,
      totalTokens
    });
  } catch (error) {
    console.error('[AI Agent] Falha na análise:', error);

    try {
      const agent = await dbOLTP('ai_agents')
        .where({ id: req.params.id }).first();

      if (agent) {
        await dbOLTP('ai_agent_usage').insert({
          agent_id: agent.id,
          prompt_version_id: agent.prompt_version_id || null,
          provider: agent.provider,
          model: agent.model,
          source: 'admin',
          status: 'error',
          metadata: JSON.stringify({
            error: error.message,
            durationMs: Date.now() - startedAt
          })
        });
      }
    } catch (logError) {
      console.error('[AI Agent] Erro ao registrar falha:', logError);
    }

    return res.status(500).send('Falha na execução do agente: ' + error.message);
  }
});


module.exports = router;
