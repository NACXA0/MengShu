var seed = require('../mock/seed.js');

var STORAGE_KEY = (seed.meta && seed.meta.storageKey) || 'mengshu-mock-v1';

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function persist(data) {
  try {
    wx.setStorageSync(STORAGE_KEY, data);
  } catch (e) {
    console.warn('[store] persist failed', e);
  }
  return data;
}

function load() {
  try {
    var raw = wx.getStorageSync(STORAGE_KEY);
    if (raw && typeof raw === 'object' && raw.meta && raw.profiles) {
      return raw;
    }
  } catch (e) {}
  return persist(clone(seed));
}

function reset() {
  return persist(clone(seed));
}

function save(db) {
  return persist(db);
}

function findById(list, id) {
  if (!list) return null;
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) return list[i];
  }
  return null;
}

function getProfile(id) {
  return findById(load().profiles, id);
}

function getOrg(id) {
  return findById(load().orgs, id);
}

function hintSeen() {
  var db = load();
  return !!(db.session && db.session.verifyHintSeen);
}

function markHintSeen() {
  var db = load();
  db.session = db.session || {};
  db.session.verifyHintSeen = true;
  save(db);
}

function redeemCode(raw) {
  var code = String(raw || '')
    .trim()
    .toUpperCase();
  if (!/^MS-[A-Z0-9]{4,}$/.test(code) && code !== 'MS-VALID' && code !== 'MS-EXPIRED') {
    return { ok: false, reason: 'format' };
  }
  var db = load();
  var item = findById(db.codes, code);
  if (!item) {
    return { ok: false, reason: 'format' };
  }
  var expired = item.status === 'expired' || item.used;
  item.used = true;
  db.verifyLogs = db.verifyLogs || [];
  db.verifyLogs.unshift({
    id: 'log_' + Date.now(),
    code: code,
    tail: code.slice(-4),
    time: formatNow(),
    expired: expired,
    profileId: item.profileId,
  });
  save(db);
  if (expired) {
    return { ok: false, reason: 'expired', code: code };
  }
  return {
    ok: true,
    code: code,
    profile: findById(db.profiles, item.profileId),
    fields: item.fields,
  };
}

function getLogs() {
  return load().verifyLogs || [];
}

function getConsents() {
  return load().consents || [];
}

function addConsent(entry) {
  var db = load();
  db.consents = db.consents || [];
  db.consents.unshift(entry);
  save(db);
  return entry;
}

function addReport(entry) {
  var db = load();
  db.reports = db.reports || [];
  db.reports.unshift(entry);
  save(db);
  return entry;
}

function formatNow() {
  var d = new Date();
  var p = function (n) {
    return n < 10 ? '0' + n : '' + n;
  };
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

function validUntil() {
  var d = new Date(Date.now() + 5 * 60 * 1000);
  return d.toISOString();
}

module.exports = {
  STORAGE_KEY: STORAGE_KEY,
  load: load,
  reset: reset,
  getProfile: getProfile,
  getOrg: getOrg,
  hintSeen: hintSeen,
  markHintSeen: markHintSeen,
  redeemCode: redeemCode,
  getLogs: getLogs,
  getConsents: getConsents,
  addConsent: addConsent,
  addReport: addReport,
  formatNow: formatNow,
  validUntil: validUntil,
};
