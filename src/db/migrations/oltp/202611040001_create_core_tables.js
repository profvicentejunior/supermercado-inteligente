
exports.up = async function (knex) {
    // USUÁRIOS DO SISTEMA
    await knex.schema.createTable('users', table => {
        table.increments('id').primary();
        table.string('name', 150).notNullable();
        table.string('email', 180).notNullable().unique();
        table.string('password_hash', 255).notNullable();
        table.string('role', 30).notNullable().defaultTo('CUSTOMER');
        table.boolean('active').notNullable().defaultTo(true);
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').nullable();
    });

    // CLIENTES
    await knex.schema.createTable('customers', table => {
        table.increments('id').primary();
        table.integer('user_id').unsigned().nullable().unique();
        table.string('name', 150).notNullable();
        table.string('document', 20).nullable().unique();
        table.string('phone', 30).nullable();
        table.string('email', 180).nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

        table.foreign('user_id')
            .references('id')
            .inTable('users');
    });

    // CATEGORIAS
    await knex.schema.createTable('categories', table => {
        table.increments('id').primary();
        table.string('name', 100).notNullable().unique();
        table.text('description').nullable();
        table.boolean('active').notNullable().defaultTo(true);
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    });

    // FORNECEDORES
    await knex.schema.createTable('suppliers', table => {
        table.increments('id').primary();
        table.string('name', 150).notNullable();
        table.string('document', 30).nullable().unique();
        table.string('email', 180).nullable();
        table.string('phone', 30).nullable();
        table.boolean('approved').notNullable().defaultTo(false);
        table.boolean('active').notNullable().defaultTo(true);
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    });

    // PRODUTOS
    await knex.schema.createTable('products', table => {
        table.increments('id').primary();
        table.integer('category_id').unsigned().nullable();
        table.string('sku', 60).notNullable().unique();
        table.string('name', 180).notNullable();
        table.text('description').nullable();
        table.decimal('price', 12, 2).notNullable().defaultTo(0);
        table.string('unit', 20).notNullable().defaultTo('UN');
        table.boolean('active').notNullable().defaultTo(true);
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').nullable();

        table.foreign('category_id')
            .references('id')
            .inTable('categories');
    });

    // ESTOQUE ATUAL
    await knex.schema.createTable('inventory', table => {
        table.increments('id').primary();
        table.integer('product_id').unsigned().notNullable().unique();
        table.integer('quantity').notNullable().defaultTo(0);
        table.integer('minimum_quantity').notNullable().defaultTo(0);
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

        table.foreign('product_id')
            .references('id')
            .inTable('products');
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('inventory');
    await knex.schema.dropTableIfExists('products');
    await knex.schema.dropTableIfExists('suppliers');
    await knex.schema.dropTableIfExists('categories');
    await knex.schema.dropTableIfExists('customers');
    await knex.schema.dropTableIfExists('users');
};

