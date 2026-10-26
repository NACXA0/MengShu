/**
 * 会话级解锁：口令只留在 App 内存，落盘永远是上锁态。
 */
var shell = require('./shell');
var vaultLib = require('./vault');

function getAppSafe() {
  try {
    return typeof getApp === 'function' ? getApp() : null;
  } catch (e) {
    return null;
  }
}

function setSessionPass(pass) {
  var app = getAppSafe();
  if (app && app.globalData) app.globalData.vaultSessionPass = pass || '';
}

function getSessionPass() {
  var app = getAppSafe();
  return (app && app.globalData && app.globalData.vaultSessionPass) || '';
}

function clearSession() {
  setSessionPass('');
}

function loadUnlocked() {
  var v = shell.getVault();
  var pass = getSessionPass();
  if (pass) {
    var r = vaultLib.unlock(v, pass);
    if (r.ok) return v;
  }
  if (!v.locked) {
    v.unlocked = true;
  }
  return v;
}

function persist(v) {
  shell.saveVault(v);
  return loadUnlocked();
}

module.exports = {
  setSessionPass: setSessionPass,
  getSessionPass: getSessionPass,
  clearSession: clearSession,
  loadUnlocked: loadUnlocked,
  persist: persist,
};
