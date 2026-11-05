const router = require('express').Router();
const { dbOLTP } = require('../config/database');

function cartCount(req) {
  return Object.values(req.session.cart || {}).reduce((sum, item) => sum + item.quantity, 0);
}

router.use((req, res, next) => {
  res.locals.cartCount = cartCount(req);
  res.locals.storeMessage = req.session.storeMessage || null;
  delete req.session.storeMessage;
  next();
});

router.get('/', async (req, res, next) => {
  try {
    const categories = await dbOLTP('categories')
      .where('active', 1).orderBy('name').limit(8);

    const products = await dbOLTP('products as p')
      .leftJoin('categories as c', 'c.id', 'p.category_id')
      .leftJoin('inventory as i', 'i.product_id', 'p.id')
      .where('p.active', 1)
      .select(
        'p.id', 'p.name', 'p.description', 'p.price', 'p.unit',
        'c.name as category_name',
        dbOLTP.raw('COALESCE(i.quantity, 0) as stock')
      )
      .orderBy('p.name')
      .limit(8);

    res.render('store/home', { title: 'Início', categories, products });
  } catch (error) {
    next(error);
  }
});

router.get('/produtos', async (req, res, next) => {
  try {
    const categories = await dbOLTP('categories')
      .where('active', 1).orderBy('name');

    const query = dbOLTP('products as p')
      .leftJoin('categories as c', 'c.id', 'p.category_id')
      .leftJoin('inventory as i', 'i.product_id', 'p.id')
      .where('p.active', 1)
      .select(
        'p.id', 'p.name', 'p.description', 'p.price', 'p.unit',
        'p.category_id', 'c.name as category_name',
        dbOLTP.raw('COALESCE(i.quantity, 0) as stock')
      );

    if (req.query.q) {
      const term = `%${req.query.q.trim()}%`;
      query.where(builder => builder
        .where('p.name', 'like', term)
        .orWhere('p.description', 'like', term)
        .orWhere('p.sku', 'like', term));
    }

    if (req.query.categoria) {
      query.where('p.category_id', Number(req.query.categoria));
    }

    const products = await query.orderBy('p.name').limit(100);

    res.render('store/catalog', {
      title: 'Produtos',
      categories,
      products,
      filters: req.query
    });
  } catch (error) {
    next(error);
  }
});



router.get('/checkout', (req, res) => {
  const items = Object.values(req.session.cart || {});
  if (!items.length) {
    req.session.storeMessage = 'Adicione produtos antes de finalizar a compra.';
    return res.redirect('/loja/produtos');
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  res.render('store/checkout', { title: 'Finalizar pedido', items, subtotal });
});

router.post('/checkout', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').trim();
  const email = String(req.body.email || '').trim();
  const address = String(req.body.address || '').trim();
  const notes = String(req.body.notes || '').trim();
  const cart = Object.values(req.session.cart || {});

  if (!cart.length) {
    req.session.storeMessage = 'Seu carrinho está vazio.';
    return res.redirect('/loja/carrinho');
  }

  if (!name || !phone || !address) {
    req.session.storeMessage = 'Preencha nome, telefone e endereço.';
    return res.redirect('/loja/checkout');
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    req.session.storeMessage = 'Informe um e-mail válido.';
    return res.redirect('/loja/checkout');
  }

  try {
    const orderNumber = 'PED-' + Date.now() + '-' +
      require('crypto').randomBytes(3).toString('hex').toUpperCase();

    await dbOLTP.transaction(async trx => {
      const orderedCart = [...cart].sort((a, b) => Number(a.productId) - Number(b.productId));
      const products = [];
      let subtotalCents = 0;

      // Bloqueia os registros de estoque para evitar vendas concorrentes.
      for (const item of orderedCart) {
        const productId = Number(item.productId);
        const quantity = Number(item.quantity);

        if (!Number.isInteger(productId) || productId < 1 ||
            !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
          throw new Error('Há um item inválido no carrinho.');
        }

        const product = await trx('products')
          .where({ id: productId, active: 1 })
          .select('id', 'name', 'sku', 'price')
          .first();

        if (!product) throw new Error('Um produto do carrinho não está mais disponível.');

        const stock = await trx('inventory')
          .where({ product_id: productId })
          .forUpdate()
          .first();

        if (!stock || Number(stock.quantity) < quantity) {
          throw new Error('Estoque insuficiente para: ' + product.name);
        }

        const unitPriceCents = Math.round(Number(product.price) * 100);
        const lineTotalCents = unitPriceCents * quantity;
        subtotalCents += lineTotalCents;

        products.push({
          product,
          quantity,
          stockBefore: Number(stock.quantity),
          unitPriceCents,
          lineTotalCents
        });
      }

      const [customerId] = await trx('customers').insert({
        name,
        phone,
        email: email || null
      });

      const subtotal = (subtotalCents / 100).toFixed(2);
      const orderNotes = [
        'Endereço de entrega: ' + address,
        notes ? 'Observações: ' + notes : ''
      ].filter(Boolean).join('\n');

      const [orderId] = await trx('orders').insert({
        order_number: orderNumber,
        customer_id: customerId,
        status: 'PENDING',
        payment_status: 'PENDING',
        subtotal,
        discount: '0.00',
        total: subtotal,
        notes: orderNotes,
        placed_at: trx.fn.now()
      });

      for (const item of products) {
        const before = item.stockBefore;
        const after = before - item.quantity;

        const updated = await trx('inventory')
          .where({ product_id: item.product.id })
          .where('quantity', '>=', item.quantity)
          .update({
            quantity: trx.raw('quantity - ?', [item.quantity]),
            updated_at: trx.fn.now()
          });

        if (!updated) throw new Error('Não foi possível atualizar o estoque de ' + item.product.name);

        await trx('order_items').insert({
          order_id: orderId,
          product_id: item.product.id,
          product_name: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          unit_price: (item.unitPriceCents / 100).toFixed(2),
          discount: '0.00',
          line_total: (item.lineTotalCents / 100).toFixed(2)
        });

        await trx('stock_movements').insert({
          product_id: item.product.id,
          movement_type: 'EXIT',
          quantity: item.quantity,
          quantity_before: before,
          quantity_after: after,
          reference_type: 'ORDER',
          reference_id: orderId,
          notes: 'Saída por venda. Pedido ' + orderNumber
        });
      }
    });

    req.session.cart = {};
    req.session.lastOrderNumber = orderNumber;
    return res.redirect('/loja/pedido-confirmado');
  } catch (error) {
    console.error('Erro no checkout:', error);
    req.session.storeMessage = error.message || 'Não foi possível finalizar o pedido.';
    return res.redirect('/loja/checkout');
  }
});

router.get('/pedido-confirmado', async (req, res, next) => {
  try {
    const orderNumber = req.session.lastOrderNumber;
    if (!orderNumber) return res.redirect('/loja');

    const order = await dbOLTP('orders')
      .where({ order_number: orderNumber })
      .first();

    if (!order) return res.redirect('/loja');

    const items = await dbOLTP('order_items')
      .where({ order_id: order.id });

    res.render('store/order-success', {
      title: 'Pedido confirmado',
      order,
      items
    });
  } catch (error) {
    next(error);
  }
});

router.get('/carrinho', (req, res) => {
  const items = Object.values(req.session.cart || {});
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  res.render('store/cart', { title: 'Meu carrinho', items, subtotal });
});

router.post('/carrinho/atualizar', async (req, res, next) => {
  try {
    const id = Number(req.body.product_id);
    const quantity = Number(req.body.quantity);
    const item = req.session.cart && req.session.cart[id];

    if (!item) return res.redirect('/loja/carrinho');

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      req.session.storeMessage = 'Quantidade inválida.';
      return res.redirect('/loja/carrinho');
    }

    const product = await dbOLTP('products as p')
      .leftJoin('inventory as i', 'i.product_id', 'p.id')
      .where('p.id', id).where('p.active', 1)
      .select('p.id', dbOLTP.raw('COALESCE(i.quantity, 0) as stock'))
      .first();

    if (!product || Number(product.stock) < quantity) {
      req.session.storeMessage = 'Estoque insuficiente para essa quantidade.';
      return res.redirect('/loja/carrinho');
    }

    item.quantity = quantity;
    res.redirect('/loja/carrinho');
  } catch (error) {
    next(error);
  }
});

router.post('/carrinho/remover', (req, res) => {
  const id = Number(req.body.product_id);
  if (req.session.cart) delete req.session.cart[id];
  req.session.storeMessage = 'Produto removido do carrinho.';
  res.redirect('/loja/carrinho');
});

router.post('/carrinho/adicionar', async (req, res, next) => {
  try {
    const productId = Number(req.body.product_id);
    const quantity = Math.max(1, Math.min(99, Number(req.body.quantity) || 1));

    if (!Number.isInteger(productId) || productId < 1) {
      req.session.storeMessage = 'Produto inválido.';
      return res.redirect('/loja/produtos');
    }

    const product = await dbOLTP('products as p')
      .leftJoin('inventory as i', 'i.product_id', 'p.id')
      .where('p.id', productId)
      .where('p.active', 1)
      .select('p.id', 'p.name', 'p.price', 'p.unit',
        dbOLTP.raw('COALESCE(i.quantity, 0) as stock'))
      .first();

    if (!product || Number(product.stock) < quantity) {
      req.session.storeMessage = 'Produto indisponível ou quantidade maior que o estoque.';
      return res.redirect(req.get('Referrer') || '/loja/produtos');
    }

    if (!req.session.cart) req.session.cart = {};

    const current = req.session.cart[productId];
    const newQuantity = (current ? current.quantity : 0) + quantity;

    if (newQuantity > Number(product.stock)) {
      req.session.storeMessage = 'Quantidade solicitada maior que o estoque disponível.';
      return res.redirect(req.get('Referrer') || '/loja/produtos');
    }

    req.session.cart[productId] = {
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      unit: product.unit,
      quantity: newQuantity
    };

    req.session.storeMessage = `${product.name} adicionado ao carrinho!`;
    res.redirect(req.get('Referrer') || '/loja/produtos');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
