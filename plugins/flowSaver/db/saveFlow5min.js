const knex = appRequire('init/knex').knex;
const tableName = 'saveFlow5min';

const config = appRequire('services/config').all();

//创建saveFlow5min表
const createTable = async() => {
  if(config.empty) {
    await knex.schema.dropTableIfExists(tableName);
  }
  const exist = await knex.schema.hasTable(tableName);
  if(exist) {
    return;
  }
  return knex.schema.createTableIfNotExists(tableName, function(table) {
    table.integer('id');
    table.integer('port');
    table.bigInteger('flow');
    table.bigInteger('time');
    table.index(['time', 'port'], '5minIndex');
  });
};

exports.createTable = createTable;
