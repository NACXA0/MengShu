var nav = require('../../utils/nav');
var store = require('../../utils/store');
var haptics = require('../../utils/haptics');

Page({
  depthPage: true,
  data: {
    layout: {},
    phase: 'enter',
    org: null,
    broken: false,
    checks: {},
    days90: false,
    read: false,
    canAllow: false,
  },

  onLoad: function (q) {
    var org = store.getOrg((q && q.org) || 'org_seed');
    var checks = {};
    ((org && org.fields) || []).forEach(function (f) {
      checks[f.key] = false;
    });
    this.setData({
      layout: nav.getNavLayout(),
      org: org,
      broken: !!(org && !org.complete),
      checks: checks,
      phase: nav.reduceMotion() ? 'in' : 'enter',
    });
    var that = this;
    nav.delay(16, function () {
      that.setData({ phase: 'in' });
    });
  },

  onBack: function () {
    this.leave(function () {
      nav.goBack();
    });
  },

  leave: function (done) {
    if (nav.reduceMotion()) {
      done();
      return;
    }
    this.setData({ phase: 'leave' });
    setTimeout(done, 400);
  },

  toggle: function (e) {
    var key = e.currentTarget.dataset.key;
    var checks = Object.assign({}, this.data.checks);
    checks[key] = !checks[key];
    this.setData({ checks: checks });
    this.refreshAllow();
  },

  toggle90: function () {
    this.setData({ days90: !this.data.days90 });
  },

  onScroll: function (e) {
    var d = e.detail || {};
    if (d.scrollHeight - d.scrollTop - d.clientHeight < 24) {
      this.setData({ read: true });
      this.refreshAllow();
    }
  },

  refreshAllow: function () {
    var checks = this.data.checks || {};
    var any = false;
    Object.keys(checks).forEach(function (k) {
      if (checks[k]) any = true;
    });
    this.setData({ canAllow: this.data.read && any });
  },

  deny: function () {
    haptics.paper();
    this.leave(function () {
      wx.redirectTo({ url: '/pages/result/result?kind=deny' });
    });
  },

  allow: function () {
    if (!this.data.canAllow) return;
    haptics.paper();
    var org = this.data.org;
    var checks = this.data.checks;
    var granted = [];
    Object.keys(checks).forEach(function (k) {
      if (checks[k]) granted.push(k);
    });
    store.addConsent({
      id: 'c_' + Date.now(),
      org: org.name,
      fields: granted.join('、'),
      time: store.formatNow(),
    });
    this.leave(function () {
      wx.redirectTo({
        url: '/pages/result/result?kind=grant&granted=' + encodeURIComponent(granted.join(',')),
      });
    });
  },

  timeoutDemo: function () {
    this.leave(function () {
      wx.redirectTo({ url: '/pages/result/result?kind=deny' });
    });
  },
});
