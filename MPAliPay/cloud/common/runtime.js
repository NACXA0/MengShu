/**
 * 云函数运行时：解析 OPENID，注入仓库。
 * 默认共享内存仓（可替换）；部署后冷启动会丢数据，正式环境再换云数据库实现同一接口。
 */
var handlers = require('./handlers');
var memoryRepo = require('./memoryRepo');

var sharedMem = null;

function getSharedMemory() {
  if (!sharedMem) sharedMem = memoryRepo.createMemoryRepo();
  return sharedMem;
}

function resolveOpenId(event) {
  try {
    var cloud = require('@alipay/faas-server-sdk');
    var ctx = cloud.getAlipayContext();
    if (ctx) {
      var id = ctx.OPENID || ctx.openId || ctx.FROM_OPENID || '';
      if (id) return id;
    }
  } catch (e) {}
  var data = extractData(event);
  return (data && data.__testOpenId) || '';
}

function extractData(event) {
  if (!event) return {};
  if (event.requestData !== undefined) {
    if (typeof event.requestData === 'string') {
      try {
        return JSON.parse(event.requestData);
      } catch (e) {
        return { raw: event.requestData };
      }
    }
    return event.requestData || {};
  }
  return event;
}

function makeMain(handlerName) {
  return function (event, context) {
    var data = extractData(event);
    var openId = resolveOpenId(event);
    var repo = getSharedMemory();
    var fn = handlers[handlerName];
    if (!fn) {
      return Promise.resolve({
        ok: false,
        reason: 'unknown',
        message: '未知云函数 ' + handlerName,
      });
    }
    return Promise.resolve(fn(data, openId, repo));
  };
}

module.exports = {
  makeMain: makeMain,
  getSharedMemory: getSharedMemory,
  extractData: extractData,
  handlers: handlers,
  createMemoryRepo: memoryRepo.createMemoryRepo,
};
