/**
 * 可注入仓库（内存）。云函数与 Node 断言共用同一套 handlers。
 */
var seed = require('./seed');
var COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function createMemoryRepo(initial) {
  var state = initial || {
    users: {},
    cooldowns: {},
    relations: {},
    profiles: clone(seed.profiles),
    codes: clone(seed.codes),
    orgs: clone(seed.orgs),
    consents: {},
    reports: [],
    certifyDown: false,
    verifyLogs: {},
  };

  return {
    _state: state,

    getUser: function (openId) {
      return state.users[openId] || null;
    },

    putUser: function (openId, doc) {
      state.users[openId] = doc;
      return doc;
    },

    deleteUser: function (openId) {
      delete state.users[openId];
    },

    getCooldownUntil: function (openId) {
      return state.cooldowns[openId] || 0;
    },

    setCooldown: function (openId, until) {
      state.cooldowns[openId] = until;
    },

    isCertifyDown: function () {
      return !!state.certifyDown;
    },

    setCertifyDown: function (down) {
      state.certifyDown = !!down;
      return state.certifyDown;
    },

    listRelations: function (openId) {
      var list = state.relations[openId] || [];
      return clone(list);
    },

    saveRelation: function (openId, rel) {
      state.relations[openId] = state.relations[openId] || [];
      var list = state.relations[openId];
      var found = -1;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === rel.id) found = i;
      }
      if (found >= 0) list[found] = rel;
      else list.unshift(rel);
      return clone(rel);
    },

    getRelation: function (openId, id) {
      var list = state.relations[openId] || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) return clone(list[i]);
      }
      return null;
    },

    getProfile: function (id) {
      for (var i = 0; i < state.profiles.length; i++) {
        if (state.profiles[i].id === id) return clone(state.profiles[i]);
      }
      return null;
    },

    listProfiles: function () {
      return clone(state.profiles);
    },

    getOrg: function (id) {
      for (var i = 0; i < state.orgs.length; i++) {
        if (state.orgs[i].id === id) return clone(state.orgs[i]);
      }
      return null;
    },

    findCode: function (code) {
      for (var i = 0; i < state.codes.length; i++) {
        if (state.codes[i].id === code) return state.codes[i];
      }
      return null;
    },

    saveCode: function (item) {
      for (var i = 0; i < state.codes.length; i++) {
        if (state.codes[i].id === item.id) {
          state.codes[i] = item;
          return;
        }
      }
      state.codes.push(item);
    },

    addVerifyLog: function (openId, log) {
      state.verifyLogs[openId] = state.verifyLogs[openId] || [];
      state.verifyLogs[openId].unshift(log);
    },

    listVerifyLogs: function (openId) {
      return clone(state.verifyLogs[openId] || []);
    },

    addConsent: function (openId, entry) {
      state.consents[openId] = state.consents[openId] || [];
      state.consents[openId].unshift(entry);
      return entry;
    },

    listConsents: function (openId) {
      return clone(state.consents[openId] || []);
    },

    addReport: function (entry) {
      state.reports.unshift(entry);
      return entry;
    },

    COOLDOWN_MS: COOLDOWN_MS,
  };
}

module.exports = {
  createMemoryRepo: createMemoryRepo,
  COOLDOWN_MS: COOLDOWN_MS,
};
