'use strict';

const knex = appRequire('init/knex').knex;

const tableName = 'user';

const config = appRequire('services/config').all();

//创建user表
const createTable = async() => {
  if(config.empty) {
    await knex.schema.dropTableIfExists(tableName);
  }
  const exist = await knex.schema.hasTable(tableName);
  if(exist) {
    return;
  }
  return knex.schema.createTableIfNotExists(tableName, function(table) {
    table.increments('id').primary();
    table.string('username').unique();
    table.string('email');
    table.string('telegram');
    table.string('password');
    table.string('type');
    table.bigInteger('createTime');
    table.bigInteger('lastLogin');
    table.string('resetPasswordId');
    table.bigInteger('resetPasswordTime');
    table.bigInteger('point',0);
  });
};

exports.createTable = createTable;
