# Supermercado Inteligente — Fase 1 (MySQL)

Aplicação educacional em Node.js + Express + EJS para demonstrar arquitetura modular, e-commerce, dados OLTP/OLAP, governança de IA e observabilidade.

## O que está nesta fase
- Interface administrativa responsiva com dashboard e central de parâmetros.
- Navegação preparada para estoque, compras, fornecedores, segurança, governança de IA e observabilidade.
- Backend Express com rotas de saúde e estrutura modular.
- Conector MySQL 8.4 LTS via `mysql2` + Knex, configuração por variáveis de ambiente.
- Primeira migration de auditoria, com identificação do ator (`human`, `ai_agent` ou `system`).
- Variáveis preparadas para Gemini e OpenTelemetry Collector.

> Importante: esta é a Fase 1. Os indicadores são fictícios; os módulos de negócio são estrutura de navegação; os parâmetros ainda não persistem; não há autenticação real, integração Gemini ou exportação OTLP implementadas nesta etapa. O endpoint `/system/health` confirma apenas que o processo HTTP está ativo, não que o banco esteja conectado.

## Requisitos
- Node.js 20 ou superior
- MySQL 8.4 LTS (ou MySQL 8 compatível)

## Preparar o MySQL
Crie os bancos e um usuário com permissões apenas sobre eles:

```sql
CREATE DATABASE supermercado_oltp CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE supermercado_olap CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'supermercado_app'@'%' IDENTIFIED BY 'troque_esta_senha';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON supermercado_oltp.* TO 'supermercado_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON supermercado_olap.* TO 'supermercado_app'@'%';
FLUSH PRIVILEGES;
```

Os dois bancos podem começar na mesma instância MySQL. O OLTP guarda operações do e-commerce; o OLAP será organizado para consultas analíticas e relatórios. Não misturar consultas analíticas pesadas com transações críticas sem avaliar impacto.

## Executar localmente

```bash
cp .env.example .env
# Edite DB_HOST, DB_USER, DB_PASSWORD e os nomes dos bancos
npm install
npm run db:migrate
npm run dev
```

Acesse `http://localhost:3000/admin/dashboard`.

## Deploy
- Configure as variáveis do `.env.example` no serviço de hospedagem; nunca envie `.env` ou credenciais ao Git.
- Para conexão entre Render e MySQL externo, confirme que o provedor permite acesso remoto, SSL/TLS, lista de IPs permitidos e conexões de saída do Render.
- Não exponha a porta 3306 publicamente sem restrição. Prefira TLS e allowlist de IP quando suportada.
- A aplicação pode exportar métricas diretamente ao Grafana Cloud por OTLP/HTTP, sem Collector separado.

## Decisões arquiteturais
- Monólito modular: simples de operar e suficiente para o escopo educacional.
- MySQL + InnoDB: transações ACID para finalizar pedidos, baixar estoque e registrar movimentações.
- OLTP e OLAP como bancos lógicos separados inicialmente; a separação física pode vir depois.
- Knex migrations para versionar a evolução do esquema.
- Compras automáticas apenas geram propostas. A aprovação humana permanece obrigatória; modo de simulação é o padrão.
- Pesquisa no catálogo nunca dispara compra. Regras de moderação não devem iniciar fluxos financeiros.
- IA auxilia classificação e análise, mas não decide sozinha operações financeiras.

## Próximas etapas sugeridas
1. Persistir parâmetros e registrar auditoria de alterações.
2. Criar entidades OLTP: usuários, produtos, categorias, estoque, pedidos, itens, pagamentos simulados e movimentações.
3. Implementar autenticação e autorização administrativa.
4. Implementar catálogo e fluxo de pedido com transação MySQL.
5. Construir camada OLAP e relatórios.
6. Integrar OpenTelemetry e Grafana Cloud.
7. Integrar Gemini com prompts versionados, limites, avaliação e circuit breaker.

## Observabilidade prática com Grafana Cloud

A aplicação expõe métricas Prometheus em `/system/metrics`:
- `supermercado_http_requests_total`: total de requisições por método, rota e status HTTP.
- `supermercado_http_request_duration_seconds`: histograma de latência.
- `supermercado_http_requests_in_flight`: requisições em andamento.
- `supermercado_process_uptime_seconds`: tempo de atividade do processo.

Após iniciar a aplicação, valide em `http://localhost:3000/system/metrics`. O endpoint não contém credenciais nem dados pessoais.

A aplicação pode enviar métricas diretamente ao Grafana Cloud usando OpenTelemetry SDK + OTLP/HTTP. Para habilitar:
1. Configure no Render `GRAFANA_CLOUD_OTLP_ENDPOINT` com o endpoint OTLP da sua stack.
2. Configure `GRAFANA_CLOUD_OTLP_AUTH` com o valor Base64 de `usuario:token`, sem o prefixo `Basic `.
3. Configure `OTEL_SERVICE_NAME=supermercado-inteligente`.
4. A aplicação exporta métricas a cada 15 segundos. Sem as duas variáveis do Grafana, a exportação fica desativada e a aplicação continua funcionando normalmente.

O endpoint local `/system/metrics` continua disponível em formato Prometheus e o painel `/system/telemetry` continua exibindo os indicadores locais. A exportação OTLP envia métricas de requisições, duração, requisições em andamento e uptime. Traces distribuídos e logs OTLP ainda não estão implementados.
