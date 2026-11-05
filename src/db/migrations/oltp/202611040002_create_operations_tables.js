
exports.up = async function (knex) {

    // 1. AJUSTE DE PRECISÃO DO ESTOQUE
    await knex.schema.alterTable('inventory', table => {
        table.decimal('quantity', 12, 3)
            .notNullable()
            .defaultTo(0)
            .alter();

        table.decimal('minimum_quantity', 12, 3)
            .notNullable()
            .defaultTo(0)
            .alter();
    });

    // 2. MOVIMENTAÇÕES DE ESTOQUE
    await knex.schema.createTable('stock_movements', table => {
        table.increments('id').primary();

        table.integer('product_id').unsigned().notNullable();
        table.integer('supplier_id').unsigned().nullable();
        table.integer('performed_by').unsigned().nullable();

        table.string('movement_type', 30).notNullable();
        // ENTRY, EXIT, ADJUSTMENT

        table.decimal('quantity', 12, 3).notNullable();
        table.decimal('quantity_before', 12, 3).notNullable();
        table.decimal('quantity_after', 12, 3).notNullable();

        table.string('reference_type', 50).nullable();
        table.integer('reference_id').unsigned().nullable();

        table.text('notes').nullable();

        table.timestamp('created_at')
            .notNullable()
            .defaultTo(knex.fn.now());

        table.foreign('product_id')
            .references('id').inTable('products');

        table.foreign('supplier_id')
            .references('id').inTable('suppliers');

        table.foreign('performed_by')
            .references('id').inTable('users');

        table.index(['product_id', 'created_at']);
        table.index(['movement_type']);
    });

    // 3. PEDIDOS
    await knex.schema.createTable('orders', table => {
        table.increments('id').primary();

        table.string('order_number', 40).notNullable().unique();

        table.integer('customer_id').unsigned().notNullable();

        table.string('status', 30)
            .notNullable()
            .defaultTo('PENDING');

        table.string('payment_status', 30)
            .notNullable()
            .defaultTo('PENDING');

        table.decimal('subtotal', 12, 2).notNullable().defaultTo(0);
        table.decimal('discount', 12, 2).notNullable().defaultTo(0);
        table.decimal('total', 12, 2).notNullable().defaultTo(0);

        table.text('notes').nullable();

        table.timestamp('placed_at').nullable();

        table.timestamp('created_at')
            .notNullable()
            .defaultTo(knex.fn.now());

        table.timestamp('updated_at').nullable();

        table.foreign('customer_id')
            .references('id').inTable('customers');

        table.index(['customer_id', 'created_at']);
        table.index(['status']);
    });

    // 4. ITENS DOS PEDIDOS
    await knex.schema.createTable('order_items', table => {
        table.increments('id').primary();

        table.integer('order_id').unsigned().notNullable();
        table.integer('product_id').unsigned().notNullable();

        // Snapshot do produto no momento da compra
        table.string('product_name', 180).notNullable();
        table.string('sku', 60).notNullable();

        table.decimal('quantity', 12, 3).notNullable();
        table.decimal('unit_price', 12, 2).notNullable();
        table.decimal('discount', 12, 2).notNullable().defaultTo(0);
        table.decimal('line_total', 12, 2).notNullable();

        table.foreign('order_id')
            .references('id').inTable('orders');

        table.foreign('product_id')
            .references('id').inTable('products');

        table.index(['order_id']);
        table.index(['product_id']);
    });

    // 5. AUDITORIA DO SISTEMA
    await knex.schema.createTable('audit_events', table => {
        table.increments('id').primary();

        table.integer('user_id').unsigned().nullable();

        table.string('action', 100).notNullable();
        table.string('entity_type', 100).notNullable();
        table.string('entity_id', 60).nullable();

        table.text('description').nullable();

        table.string('ip_address', 45).nullable();
        table.string('user_agent', 500).nullable();

        // Dados adicionais serializados em JSON pela aplicação
        table.text('metadata').nullable();

        table.timestamp('created_at')
            .notNullable()
            .defaultTo(knex.fn.now());

        table.foreign('user_id')
            .references('id').inTable('users');

        table.index(['entity_type', 'entity_id']);
        table.index(['user_id', 'created_at']);
        table.index(['action']);
    });
};

exports.down = async function (knex) {

    await knex.schema.dropTableIfExists('audit_events');
    await knex.schema.dropTableIfExists('order_items');
    await knex.schema.dropTableIfExists('orders');
    await knex.schema.dropTableIfExists('stock_movements');

    // Retorna aos tipos anteriores.
    // Atenção: pode haver perda de precisão se existirem
    // quantidades fracionárias cadastradas.
    await knex.schema.alterTable('inventory', table => {
        table.integer('quantity')
            .unsigned()
            .notNullable()
            .defaultTo(0)
            .alter();

        table.integer('minimum_quantity')
            .unsigned()
            .notNullable()
            .defaultTo(0)
            .alter();
    });
};

