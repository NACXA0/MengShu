/**
 * 小程序端云函数封装。
 * 无 my.cloud 或调用失败时，可选用本地 handlers + 内存仓兜底（开发者工具未关联环境时）。
 */
var env = require('./env');
var handlers = require('../cloud/common/handlers');
var memoryRepo = require('../cloud/common/memoryRepo');

var localRepo = null;
var localOpenId = 'local_dev_openid';

function getLocalRepo() {
  if (!localRepo) localRepo = memoryRepo.createMemoryRepo();
  return localRepo;
}

function resetLocal() {
  localRepo = memoryRepo.createMemoryRepo();
  return localRepo;
}

function setLocalOpenId(id) {
  if (id) localOpenId = id;
}

function getLocalOpenId() {
  return localOpenId;
}

function init() {
  if (typeof my === 'undefined' || !my.cloud || typeof my.cloud.init !== 'function') {
    return false;
  }
  try {
    var opts = {};
    if (env.envId) opts.env = env.envId;
    my.cloud.init(opts);
    return true;
  } catch (e) {
    console.warn('[cloud] init failed', e);
    return false;
  }
}

function callRemote(name, data) {
  return new Promise(function (resolve, reject) {
    if (typeof my === 'undefined' || !my.cloud || typeof my.cloud.callFunction !== 'function') {
      reject(new Error('no my.cloud'));
      return;
    }
    my.cloud
      .callFunction({
        name: name,
        data: data || {},
      })
      .then(function (res) {
        resolve((res && (res.result !== undefined ? res.result : res.data)) || res);
      })
      .catch(reject);
  });
}

var NAME_TO_HANDLER = {
  authEnter: 'authEnter',
  authLogout: 'authLogout',
  certifyCheck: 'certifyCheck',
  demoSetCertifyDown: 'demoSetCertifyDown',
  relationList: 'relationList',
  relationSave: 'relationSave',
  plazaGet: 'plazaGet',
  verifyRedeem: 'verifyRedeem',
  verifyLogs: 'verifyLogs',
  consentAdd: 'consentAdd',
  consentList: 'consentList',
  reportAdd: 'reportAdd',
  getOrg: 'getOrg',
};

function callLocal(name, data) {
  var key = NAME_TO_HANDLER[name];
  var fn = handlers[key];
  if (!fn) {
    return Promise.resolve({ ok: false, reason: 'unknown', message: '未知函数 ' + name });
  }
  return Promise.resolve(fn(data || {}, localOpenId, getLocalRepo()));
}

/**
 * 调用云函数；无 envId 或远程失败时用本地 handlers 兜底（同一套业务逻辑）。
 */
function call(name, data) {
  if (!env.envId) {
    return callLocal(name, data);
  }
  return callRemote(name, data).catch(function (err) {
    console.warn('[cloud] remote fail, local fallback', name, err && err.message);
    return callLocal(name, data);
  });
}

module.exports = {
  init: init,
  call: call,
  callLocal: callLocal,
  setLocalOpenId: setLocalOpenId,
  getLocalOpenId: getLocalOpenId,
  getLocalRepo: getLocalRepo,
  resetLocal: resetLocal,
};
