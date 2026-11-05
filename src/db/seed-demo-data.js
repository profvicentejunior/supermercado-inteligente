/**
 * Carga transacional de demonstração — Supermercado Inteligente
 *
 * Cria 500 clientes e 30 fornecedores fictícios, associa fornecedores
 * aos produtos, inicializa estoque e gera 3.000 pedidos com itens.
 *
 * Segurança:
 * - Não altera nem recria produtos.
 * - Não apaga dados.
 * - Usa prefixos DEMO para identificar os dados gerados.
 * - Executa a carga transacional em uma única transação.
 * - Se já encontrar pedidos DEMO, não repete a carga de vendas/estoque.
 *
 * Requer a migration supplier_products aplicada.
 * Compatível com MySQL 5.7 + Knex/mysql2.
 */

const { dbOLTP } = require('../config/database');

const TAG = 'SEED_DEMO_V1';
const CUSTOMER_COUNT = 500;
const SUPPLIER_COUNT = 30;
const ORDER_COUNT = 3000;
const BATCH_SIZE = 200;

function pad(value, size = 4) {
  return String(value).padStart(size, '0');
}

// PRNG determinístico: mesma sequência em execuções equivalentes.
function randomGenerator(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function money(value) {
  return Number(Number(value).toFixed(2));
}

function chunks(items, size = BATCH_SIZE) {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function randomDate(random, start, end) {
  const from = start.getTime();
  const to = end.getTime();
  return new Date(from + Math.floor(random() * (to - from)));
}

function buildCustomers() {
  return Array.from({ length: CUSTOMER_COUNT }, (_, index) => {
    const n = pad(index + 1);
    return {
      name: `Cliente Demonstração ${n}`,
      email: `demo.cliente.${n}@supermercado.local`,
      phone: `8599${String(1000000 + index).slice(-6)}`
    };
  });
}

function buildSuppliers() {
  const areas = [
    'Alimentos', 'Bebidas', 'Hortifruti', 'Laticínios', 'Limpeza',
    'Higiene', 'Congelados', 'Mercearia', 'Carnes', 'Utilidades'
  ];

  return Array.from({ length: SUPPLIER_COUNT }, (_, index) => {
    const n = pad(index + 1, 3);
    return {
      name: `Fornecedor Demonstração ${areas[index % areas.length]} ${n}`,
      email: `demo.fornecedor.${n}@supermercado.local`,
      phone: `8532${String(100000 + index).slice(-6)}`,
      approved: true,
      active: true
    };
  });
}

async function insertMissingByEmail(trx, tableName, rows) {
  const emails = rows.map(row => row.email);
  const existing = await trx(tableName).select('email').whereIn('email', emails);
  const existingSet = new Set(existing.map(row => row.email));
  const missing = rows.filter(row => !existingSet.has(row.email));

  for (const batch of chunks(missing)) {
    await trx(tableName).insert(batch);
  }

  return trx(tableName).select('id', 'email').whereIn('email', emails);
}

async function seedCustomers(trx) {
  const rows = buildCustomers();
  const saved = await insertMissingByEmail(trx, 'customers', rows);
  return saved.sort((a, b) => a.email.localeCompare(b.email));
}

async function seedSuppliers(trx) {
  const rows = buildSuppliers();
  const saved = await insertMissingByEmail(trx, 'suppliers', rows);
  return saved.sort((a, b) => a.email.localeCompare(b.email));
}

async function seedSupplierProducts(trx, suppliers, products, random) {
  const existing = await trx('supplier_products')
    .select('supplier_id', 'product_id');

  const keys = new Set(existing.map(row => `${row.supplier_id}:${row.product_id}`));
  const rows = [];

  for (const product of products) {
    const first = Math.floor(random() * suppliers.length);
    const count = 1 + Math.floor(random() * 2);

    for (let offset = 0; offset < count; offset++) {
      const supplier = suppliers[(first + offset) % suppliers.length];
      const key = `${supplier.id}:${product.id}`;
      if (keys.has(key)) continue;

      rows.push({
        supplier_id: supplier.id,
        product_id: product.id,
        purchase_price: money(Number(product.price) * (0.62 + random() * 0.16)),
        lead_time_days: 1 + Math.floor(random() * 8),
        minimum_order_quantity: 1,
        active: true
      });
      keys.add(key);
    }
  }

  for (const batch of chunks(rows)) {
    await trx('supplier_products').insert(batch);
  }

  return rows.length;
}

async function createOpeningInventory(trx, products, random) {
  const movements = [];
  let created = 0;

  for (const product of products) {
    const opening = 100 + Math.floor(random() * 101);
    const minimum = 10 + Math.floor(random() * 21);

    const current = await trx('inventory')
      .where({ product_id: product.id })
      .first();

    const before = current ? Number(current.quantity) : 0;
    const after = money(before + opening);

    if (current) {
      await trx('inventory')
        .where({ product_id: product.id })
        .update({
          quantity: after,
          minimum_quantity: Number(current.minimum_quantity || minimum),
          updated_at: trx.fn.now()
        });
    } else {
      await trx('inventory').insert({
        product_id: product.id,
        quantity: after,
        minimum_quantity: minimum
      });
    }

    movements.push({
      product_id: product.id,
      supplier_id: null,
      performed_by: null,
      movement_type: 'ENTRY',
      quantity: opening,
      quantity_before: before,
      quantity_after: after,
      reference_type: 'DEMO_SEED',
      reference_id: null,
      notes: TAG + ': estoque inicial fictício',
      created_at: new Date('2023-12-31T23:59:59.000Z')
    });
    created++;
  }

  for (const batch of chunks(movements)) {
    await trx('stock_movements').insert(batch);
  }

  return created;
}

async function createDemoOrders(trx, customers, products, suppliers, random) {
  const existing = await trx('orders')
    .where('order_number', 'like', 'DEMO-%')
    .count({ total: '*' })
    .first();

  if (Number(existing.total) > 0) {
    console.log(`Já existem ${existing.total} pedidos DEMO. A etapa de vendas/estoque será preservada.`);
    return { orders: 0, items: 0, movements: 0, skipped: true };
  }

  const stockRows = await trx('inventory')
    .select('product_id', 'quantity')
    .whereIn('product_id', products.map(product => product.id));

  const stock = new Map(stockRows.map(row => [Number(row.product_id), Number(row.quantity)]));
  const productById = new Map(products.map(product => [Number(product.id), product]));

  const start = new Date('2024-01-01T12:00:00.000Z');
  const end = new Date('2026-11-04T12:00:00.000Z');
  let totalItems = 0;
  let totalMovements = 0;

  for (let orderIndex = 1; orderIndex <= ORDER_COUNT; orderIndex++) {
    const customer = customers[Math.floor(random() * customers.length)];
    const placedAt = randomDate(random, start, end);
    const orderNumber = `DEMO-${pad(orderIndex, 6)}`;
    const wantedItems = 2 + Math.floor(random() * 4);
    const selected = new Set();
    const itemRows = [];
    const movementRows = [];
    let subtotal = 0;
    let discountTotal = 0;

    let attempts = 0;
    while (selected.size < wantedItems && attempts < wantedItems * 10) {
      attempts++;
      const product = products[Math.floor(random() * products.length)];
      const productId = Number(product.id);
      if (selected.has(productId)) continue;

      const available = stock.get(productId) || 0;
      const quantity = 1 + Math.floor(random() * 3);
      if (available < quantity) continue;

      selected.add(productId);
      const unitPrice = Number(product.price);
      const gross = money(unitPrice * quantity);
      const discount = random() < 0.18 ? money(gross * (0.03 + random() * 0.07)) : 0;
      const lineTotal = money(gross - discount);

      subtotal = money(subtotal + gross);
      discountTotal = money(discountTotal + discount);

      itemRows.push({
        product_id: productId,
        product_name: product.name,
        sku: product.sku,
        quantity,
        unit_price: unitPrice,
        discount,
        line_total: lineTotal
      });

      const before = available;
      const after = money(before - quantity);
      stock.set(productId, after);

      movementRows.push({
        product_id: productId,
        supplier_id: null,
        performed_by: null,
        movement_type: 'EXIT',
        quantity,
        quantity_before: before,
        quantity_after: after,
        reference_type: 'ORDER',
        reference_id: null,
        notes: TAG + ': baixa por venda demonstrativa',
        created_at: placedAt
      });
    }

    if (itemRows.length === 0) {
      throw new Error(`Não foi possível montar itens para o pedido ${orderNumber}.`);
    }

    const total = money(subtotal - discountTotal);
    const [orderId] = await trx('orders').insert({
      order_number: orderNumber,
      customer_id: customer.id,
      status: 'DELIVERED',
      payment_status: 'PAID',
      subtotal,
      discount: discountTotal,
      total,
      notes: TAG + ': pedido fictício para demonstração',
      placed_at: placedAt,
      created_at: placedAt,
      updated_at: placedAt
    });

    for (const item of itemRows) item.order_id = orderId;
    for (const movement of movementRows) movement.reference_id = orderId;

    await trx('order_items').insert(itemRows);
    for (const batch of chunks(movementRows)) {
      await trx('stock_movements').insert(batch);
    }

    for (const item of itemRows) {
      const product = productById.get(item.product_id);
      await trx('inventory')
        .where({ product_id: item.product_id })
        .update({
          quantity: stock.get(item.product_id),
          updated_at: trx.fn.now()
        });
      if (!product) throw new Error('Produto não encontrado durante atualização do estoque.');
    }

    totalItems += itemRows.length;
    totalMovements += movementRows.length;

    if (orderIndex % 250 === 0) {
      console.log(`Pedidos processados: ${orderIndex}/${ORDER_COUNT}`);
    }
  }

  return {
    orders: ORDER_COUNT,
    items: totalItems,
    movements: totalMovements,
    skipped: false
  };
}

async function main() {
  console.log('==============================================');
  console.log(' CARGA DEMONSTRATIVA — SUPERMERCADO INTELIGENTE');
  console.log('==============================================');

  try {
    const requiredTables = [
      'customers', 'suppliers', 'products', 'inventory',
      'stock_movements', 'orders', 'order_items', 'supplier_products'
    ];

    for (const table of requiredTables) {
      if (!(await dbOLTP.schema.hasTable(table))) {
        throw new Error(
          `Tabela ${table} não encontrada. Execute npm run db:migrate antes do seed.`
        );
      }
    }

    const result = await dbOLTP.transaction(async trx => {
      const random = randomGenerator(20261105);

      console.log('1/5 — Criando clientes fictícios...');
      const customers = await seedCustomers(trx);

      console.log('2/5 — Criando fornecedores fictícios...');
      const suppliers = await seedSuppliers(trx);

      const products = await trx('products')
        .select('id', 'sku', 'name', 'price', 'unit')
        .where({ active: 1 })
        .orderBy('id');

      if (products.length === 0) {
        throw new Error('Nenhum produto ativo encontrado. Execute o seed de catálogo primeiro.');
      }

      console.log('3/5 — Associando fornecedores aos produtos...');
      const supplierLinks = await seedSupplierProducts(trx, suppliers, products, random);

      console.log('4/5 — Preparando estoque inicial...');
      const openingMovements = await createOpeningInventory(trx, products, random);

      console.log('5/5 — Gerando pedidos, itens e saídas de estoque...');
      const sales = await createDemoOrders(trx, customers, products, suppliers, random);

      return {
        customers: customers.length,
        suppliers: suppliers.length,
        products: products.length,
        supplierLinks,
        openingMovements,
        ...sales
      };
    });

    console.log('\nCARGA CONCLUÍDA');
    console.table(result);
  } catch (error) {
    console.error('\nERRO NA CARGA DEMONSTRATIVA');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await dbOLTP.destroy();
  }
}

main();
