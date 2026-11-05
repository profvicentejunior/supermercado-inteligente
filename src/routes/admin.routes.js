const router = require('express').Router();
const aiGovernanceRoutes = require('./ai-governance.routes');

const pages = {
  inventory: ['Estoque', 'Acompanhe níveis de estoque, previsão de ruptura e movimentações.'],
  purchases: ['Compras e reposição', 'Cotações, propostas automáticas e aprovação humana.'],
  observability: ['Observabilidade', 'Traces, métricas e logs com OpenTelemetry e Grafana Cloud.'],
  security: ['Segurança e auditoria', 'Controles OWASP, eventos de segurança e políticas de moderação.']
};

router.get('/dashboard', (req, res) =>
  res.render('admin/dashboard', { title: 'Visão geral' })
);

router.get('/settings', (req, res) =>
  res.render('admin/settings', { title: 'Central de parâmetros' })
);

router.use('/ai-governance', aiGovernanceRoutes);

for (const [slug, data] of Object.entries(pages)) {
  router.get('/' + slug, (req, res) =>
    res.render('admin/placeholder', {
      title: data[0],
      description: data[1]
    })
  );
}


router.get('/orders', async (req, res, next) => {
  try {
    const { dbOLTP } = require('../config/database');
    const orders = await dbOLTP('orders as o')
      .leftJoin('customers as c', 'c.id', 'o.customer_id')
      .select('o.id', 'o.order_number', 'o.status', 'o.payment_status',
        'o.total', 'o.created_at', 'c.name as customer_name')
      .orderBy('o.id', 'desc')
      .limit(100);

    res.render('admin/orders', { title: 'Gestão de pedidos', orders });
  } catch (error) { next(error); }
});

router.get('/orders/:id', async (req, res, next) => {
  try {
    const { dbOLTP } = require('../config/database');
    const order = await dbOLTP('orders as o')
      .leftJoin('customers as c', 'c.id', 'o.customer_id')
      .where('o.id', req.params.id)
      .select('o.*', 'c.name as customer_name',
        'c.phone as customer_phone', 'c.email as customer_email')
      .first();

    if (!order) return res.status(404).send('Pedido não encontrado');

    const items = await dbOLTP('order_items').where({ order_id: order.id });
    res.render('admin/order-detail', { title: 'Detalhes do pedido', order, items });
  } catch (error) { next(error); }
});

router.post('/orders/:id/status', async (req, res, next) => {
  try {
    const { dbOLTP } = require('../config/database');
    const allowed = ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'];
    const status = String(req.body.status || '').toUpperCase();

    if (!allowed.includes(status)) return res.status(400).send('Status inválido');

    const count = await dbOLTP('orders')
      .where({ id: req.params.id })
      .update({ status, updated_at: dbOLTP.fn.now() });

    if (!count) return res.status(404).send('Pedido não encontrado');
    res.redirect('/admin/orders/' + Number(req.params.id));
  } catch (error) { next(error); }
});



router.post('/orders/:id/payment', async (req, res, next) => {
  try {
    const { dbOLTP } = require('../config/database');
    const allowed = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];
    const paymentStatus = String(req.body.payment_status || '').toUpperCase();

    if (!allowed.includes(paymentStatus)) {
      return res.status(400).send('Situação de pagamento inválida');
    }

    const count = await dbOLTP('orders')
      .where({ id: req.params.id })
      .update({
        payment_status: paymentStatus,
        updated_at: dbOLTP.fn.now()
      });

    if (!count) return res.status(404).send('Pedido não encontrado');
    res.redirect('/admin/orders/' + Number(req.params.id));
  } catch (error) { next(error); }
});


module.exports = router;
