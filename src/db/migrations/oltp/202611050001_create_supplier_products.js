/**
 * Relacionamento entre fornecedores e produtos.
 * Compatível com MySQL 5.7.
 */
exports.up = async function (knex) {
  const exists = await knex.schema.hasTable('supplier_products');
  if (exists) return;

  await knex.schema.createTable('supplier_products', table => {
    table.increments('id').primary();
    table.integer('supplier_id').unsigned().notNullable();
    table.integer('product_id').unsigned().notNullable();
    table.decimal('purchase_price', 12, 2).notNullable().defaultTo(0);
    table.integer('lead_time_days').unsigned().notNullable().defaultTo(3);
    table.decimal('minimum_order_quantity', 12, 3).notNullable().defaultTo(1);
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['supplier_id', 'product_id'], 'uq_supplier_products_pair');
    table.index(['product_id', 'active'], 'idx_supplier_products_product');
    table.foreign('supplier_id').references('id').inTable('suppliers');
    table.foreign('product_id').references('id').inTable('products');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('supplier_products');
};
