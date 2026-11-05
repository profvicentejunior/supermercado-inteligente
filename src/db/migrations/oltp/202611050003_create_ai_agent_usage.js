exports.up = async function (knex) {
  await knex.schema.createTable('ai_agent_usage', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('agent_id').unsigned().notNullable();
    table.bigInteger('prompt_version_id').unsigned().nullable();

    table.string('provider', 80).nullable();
    table.string('model', 120).nullable();

    table.integer('input_tokens').unsigned().notNullable().defaultTo(0);
    table.integer('output_tokens').unsigned().notNullable().defaultTo(0);
    table.integer('total_tokens').unsigned().notNullable().defaultTo(0);

    table.decimal('estimated_cost', 14, 8).notNullable().defaultTo(0);
    table.string('currency', 3).notNullable().defaultTo('USD');

    table.string('source', 30).notNullable().defaultTo('manual');
    table.string('status', 30).notNullable().defaultTo('completed');
    table.string('request_id', 150).nullable();
    table.json('metadata').nullable();

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.foreign('agent_id').references('ai_agents.id');
    table.foreign('prompt_version_id').references('ai_prompt_versions.id');

    table.index(['agent_id', 'created_at']);
    table.index(['provider', 'model']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('ai_agent_usage');
};
