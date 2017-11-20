if(process.env.NODE_ENV !== 'production') {
  console.log('use babel-core/register');
  require('babel-core/register');
}

require('./init/log');

const log4js = require('log4js');
const logger = log4js.getLogger('system');

logger.info('System start.');

process.on('unhandledRejection', (reason, p) => {
  logger.error('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error(`Caught exception: ${err}`);
});

require('./init/utils');

require('./init/moveConfigFile');
require('./init/checkConfig');
require('./init/knex');

//1.初始化数据库
const initDb = require('./init/loadModels').init;

//2.运行shadowocks
initDb().then(() => {
  return require('./init/runShadowsocks').run();
}).then(() => {
  //3.启动服务、加载插件
  require('./init/loadServices');
  require('./init/loadPlugins');
}).catch(err => {
  logger.error(err);
});
