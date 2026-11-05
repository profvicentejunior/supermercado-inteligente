
exports.up = async function (knex) {

    // 1. DIMENSÃO DE TEMPO
    await knex.schema.createTable('dim_date', table => {
        // Formato: AAAAMMDD. Exemplo: 20261105.
        table.integer('date_key').unsigned().primary();

        table.date('date_value').notNullable().unique();

        table.integer('calendar_year').unsigned().notNullable();
        table.integer('quarter').unsigned().notNullable();
        table.integer('month_number').unsigned().notNullable();
        table.string('month_name', 20).notNullable();

        table.integer('day_of_month').unsigned().notNullable();
        table.integer('day_of_week').unsigned().notNullable();
        table.string('day_name', 20).notNullable();

        table.boolean('is_weekend').notNullable().defaultTo(false);
    });

    // 2. DIMENSÃO DE PRODUTOS
    await knex.schema.createTable('dim_product', table => {
        table.increments('product_key').primary();

        // Identificador original do OLTP.
        table.integer('source_product_id').unsigned()
            .notNullable().unique();

        table.string('sku', 60).notNullable();
        table.string('product_name', 180).notNullable();
        table.string('category_name', 100).nullable();

        table.string('unit', 20).notNullable();

        table.decimal('current_price', 12, 2)
            .notNullable().defaultTo(0);

        table.boolean('active').notNullable().defaultTo(true);

        table.dateTime('loaded_at').notNullable()
            .defaultTo(knex.fn.now());

        table.index(['product_name']);
        table.index(['category_name']);
    });

    // 3. DIMENSÃO DE CLIENTES
    await knex.schema.createTable('dim_customer', table => {
        table.increments('customer_key').primary();

        table.integer('source_customer_id').unsigned()
            .notNullable().unique();

        table.string('customer_name', 150).notNullable();

        table.string('email', 180).nullable();

        table.dateTime('loaded_at').notNullable()
            .defaultTo(knex.fn.now());

        table.index(['customer_name']);
    });

    // 4. DIMENSÃO DE FORNECEDORES
    await knex.schema.createTable('dim_supplier', table => {
        table.increments('supplier_key').primary();

        table.integer('source_supplier_id').unsigned()
            .notNullable().unique();

        table.string('supplier_name', 150).notNullable();

        table.boolean('approved').notNullable().defaultTo(false);
        table.boolean('active').notNullable().defaultTo(true);

        table.dateTime('loaded_at').notNullable()
            .defaultTo(knex.fn.now());

        table.index(['supplier_name']);
    });

    // 5. FATO DE VENDAS
    // Granularidade: um registro para cada item de pedido.
    await knex.schema.createTable('fact_sales', table => {
        table.increments('sales_key').primary();

        table.integer('date_key').unsigned().notNullable();
        table.integer('product_key').unsigned().notNullable();
        table.integer('customer_key').unsigned().notNullable();

        // Identificadores de origem no OLTP.
        table.integer('source_order_id').unsigned().notNullable();
        table.integer('source_order_item_id').unsigned()
            .notNullable().unique();

        table.string('order_number', 40).notNullable();

        table.decimal('quantity', 12, 3).notNullable();
        table.decimal('unit_price', 12, 2).notNullable();

        table.decimal('gross_amount', 12, 2).notNullable();
        table.decimal('discount_amount', 12, 2).notNullable();
        table.decimal('net_amount', 12, 2).notNullable();

        table.dateTime('loaded_at').notNullable()
            .defaultTo(knex.fn.now());

        table.foreign('date_key')
            .references('date_key').inTable('dim_date');

        table.foreign('product_key')
            .references('product_key').inTable('dim_product');

        table.foreign('customer_key')
            .references('customer_key').inTable('dim_customer');

        table.index(['date_key', 'product_key']);
        table.index(['date_key', 'customer_key']);
        table.index(['source_order_id']);
    });

    // 6. FATO DE ESTOQUE
    // Granularidade: um produto em uma data de fotografia.
    await knex.schema.createTable('fact_inventory', table => {
        table.increments('inventory_key').primary();

        table.integer('date_key').unsigned().notNullable();
        table.integer('product_key').unsigned().notNullable();

        table.decimal('quantity', 12, 3).notNullable();
        table.decimal('minimum_quantity', 12, 3).notNullable();

        table.boolean('below_minimum').notNullable();

        table.dateTime('loaded_at').notNullable()
            .defaultTo(knex.fn.now());

        table.foreign('date_key')
            .references('date_key').inTable('dim_date');

        table.foreign('product_key')
            .references('product_key').inTable('dim_product');

        table.unique(['date_key', 'product_key']);

        table.index(['date_key']);
        table.index(['product_key']);
        table.index(['below_minimum']);
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('fact_inventory');
    await knex.schema.dropTableIfExists('fact_sales');

    await knex.schema.dropTableIfExists('dim_supplier');
    await knex.schema.dropTableIfExists('dim_customer');
    await knex.schema.dropTableIfExists('dim_product');
    await knex.schema.dropTableIfExists('dim_date');
};

