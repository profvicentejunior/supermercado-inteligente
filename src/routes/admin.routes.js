const router = require('express').Router();
const pages = {
  inventory: ['Estoque', 'Acompanhe níveis de estoque, previsão de ruptura e movimentações.'],
  purchases: ['Compras e reposição', 'Cotações, propostas automáticas e aprovação humana.'],
  observability: ['Observabilidade', 'Traces, métricas e logs com OpenTelemetry e Grafana Cloud.'],
  'ai-governance': ['Governança de IA', 'Prompts versionados, agentes, custos, avaliações e limites.'],
  security: ['Segurança e auditoria', 'Controles OWASP, eventos de segurança e políticas de moderação.']
};
router.get('/dashboard', (req, res) => res.render('admin/dashboard', { title: 'Visão geral' }));
router.get('/settings', (req, res) => res.render('admin/settings', { title: 'Central de parâmetros' }));
for (const [slug, data] of Object.entries(pages)) router.get('/' + slug, (req, res) => res.render('admin/placeholder', { title: data[0], description: data[1] }));
module.exports = router;
