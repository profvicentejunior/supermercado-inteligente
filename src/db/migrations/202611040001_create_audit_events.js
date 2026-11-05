exports.up = async function (knex) {
  await knex.schema.createTable('audit_events', (table) => {
    table.bigIncrements('id').primary();
    table.string('actor_type', 30).notNullable().comment('human, ai_agent, system');
    table.string('actor_id', 120).nullable();
    table.string('action', 120).notNullable();
    table.string('entity_type', 80).nullable();
    table.string('entity_id', 120).nullable();
    table.json('before_data').nullable();
    table.json('after_data').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.index(['entity_type', 'entity_id']);
    table.index(['created_at']);
  });
};
exports.down = async function (knex) { await knex.schema.dropTableIfExists('audit_events'); };
