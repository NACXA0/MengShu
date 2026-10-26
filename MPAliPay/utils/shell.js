/**
 * 统一本机状态：身份 + 保险库 + 演示开关。
 * 公开页种子仍走 store.js。
 */
var platform = require('./platform');
var identity = require('./identity');
var vaultLib = require('./vault');

var SHELL_KEY = 'mengshu-alipay-shell-v1';

function empty() {
  return {
    meta: { version: 1, storageKey: SHELL_KEY },
    identity: identity.createEmptyIdentityState(),
    vault: vaultLib.createEmptyVault(),
    /** 核验页回传：{ action, ok, ts } */
    pendingCertify: null,
    /** 签署页角色：'A' | 'B' */
    signRole: 'A',
  };
}

function load() {
  try {
    var raw = platform.getStorage(SHELL_KEY);
    if (raw && typeof raw === 'object' && raw.meta && raw.identity) {
      raw.vault = raw.vault || vaultLib.createEmptyVault();
      raw.vault.unlocked = false;
      return raw;
    }
  } catch (e) {}
  var fresh = empty();
  save(fresh);
  return fresh;
}

function save(db) {
  var copy = JSON.parse(JSON.stringify(db));
  if (copy.vault) copy.vault.unlocked = false;
  platform.setStorage(SHELL_KEY, copy);
  return db;
}

function resetShell() {
  var fresh = empty();
  save(fresh);
  return fresh;
}

function getIdentity() {
  return load().identity;
}

function saveIdentity(idState) {
  var db = load();
  db.identity = idState;
  save(db);
  return idState;
}

function getVault() {
  return load().vault;
}

function saveVault(v) {
  var db = load();
  db.vault = v;
  save(db);
  return v;
}

function setPendingCertify(payload) {
  var db = load();
  db.pendingCertify = payload;
  save(db);
}

function takePendingCertify() {
  var db = load();
  var p = db.pendingCertify;
  db.pendingCertify = null;
  save(db);
  return p;
}

function getSignRole() {
  return load().signRole || 'A';
}

function setSignRole(role) {
  var db = load();
  db.signRole = role === 'B' ? 'B' : 'A';
  save(db);
  return db.signRole;
}

module.exports = {
  SHELL_KEY: SHELL_KEY,
  load: load,
  save: save,
  empty: empty,
  resetShell: resetShell,
  getIdentity: getIdentity,
  saveIdentity: saveIdentity,
  getVault: getVault,
  saveVault: saveVault,
  setPendingCertify: setPendingCertify,
  takePendingCertify: takePendingCertify,
  getSignRole: getSignRole,
  setSignRole: setSignRole,
};
