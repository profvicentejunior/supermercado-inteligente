exports.up = async function (knex) {
  if (!(await knex.schema.hasTable('ai_prompts'))) {
    await knex.schema.createTable('ai_prompts', table => {
      table.bigIncrements('id').primary();
      table.string('name', 150).notNullable();
      table.string('slug', 180).notNullable().unique();
      table.text('description').nullable();
      table.string('category', 80).nullable();
      table.string('status', 20).notNullable().defaultTo('active');
      table.integer('current_version').unsigned().notNullable().defaultTo(1);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').nullable();
    });
  }

  if (!(await knex.schema.hasTable('ai_prompt_versions'))) {
    await knex.schema.createTable('ai_prompt_versions', table => {
      table.bigIncrements('id').primary();
      table.bigInteger('prompt_id').unsigned().notNullable();
      table.integer('version').unsigned().notNullable();
      table.text('content').notNullable();
      table.text('change_notes').nullable();
      table.string('created_by', 120).nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.unique(['prompt_id', 'version']);
      table.foreign('prompt_id')
        .references('id').inTable('ai_prompts')
        .onDelete('CASCADE');
    });
  }

  if (!(await knex.schema.hasTable('ai_agents'))) {
    await knex.schema.createTable('ai_agents', table => {
      table.bigIncrements('id').primary();
      table.string('name', 150).notNullable();
      table.string('slug', 180).notNullable().unique();
      table.text('description').nullable();
      table.bigInteger('prompt_id').unsigned().nullable();
      table.bigInteger('prompt_version_id').unsigned().nullable();
      table.string('provider', 60).notNullable().defaultTo('not_configured');
      table.string('model', 120).nullable();
      table.decimal('temperature', 3, 2).notNullable().defaultTo(0.30);
      table.integer('max_tokens').unsigned().nullable();
      table.text('configuration').nullable();
      table.string('status', 20).notNullable().defaultTo('inactive');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').nullable();

      table.index(['status']);
      table.foreign('prompt_id')
        .references('id').inTable('ai_prompts')
        .onDelete('SET NULL');
      table.foreign('prompt_version_id')
        .references('id').inTable('ai_prompt_versions')
        .onDelete('SET NULL');
    });
  }

  if (!(await knex.schema.hasTable('ai_agent_evaluations'))) {
    await knex.schema.createTable('ai_agent_evaluations', table => {
      table.bigIncrements('id').primary();
      table.bigInteger('agent_id').unsigned().notNullable();
      table.bigInteger('prompt_version_id').unsigned().nullable();
      table.string('evaluation_type', 60).notNullable();
      table.decimal('score', 8, 2).nullable();
      table.string('result', 30).notNullable().defaultTo('pending');
      table.text('input_data').nullable();
      table.text('output_data').nullable();
      table.text('notes').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['agent_id', 'created_at']);
      table.foreign('agent_id')
        .references('id').inTable('ai_agents')
        .onDelete('CASCADE');
      table.foreign('prompt_version_id')
        .references('id').inTable('ai_prompt_versions')
        .onDelete('SET NULL');
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('ai_agent_evaluations');
  await knex.schema.dropTableIfExists('ai_agents');
  await knex.schema.dropTableIfExists('ai_prompt_versions');
  await knex.schema.dropTableIfExists('ai_prompts');
};
