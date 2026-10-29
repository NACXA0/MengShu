var nav = require('../../utils/nav');
var cloud = require('../../utils/cloud');
var haptics = require('../../utils/haptics');
var platform = require('../../utils/platform');
var shell = require('../../utils/shell');

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
    awaitingCertify: false,
  },

  onLoad: function (q) {
    var that = this;
    var orgId = (q && q.org) || 'org_seed';
    this.setData({
      layout: nav.getNavLayout(),
      phase: nav.reduceMotion() ? 'in' : 'enter',
    });
    cloud.call('getOrg', { id: orgId }).then(function (res) {
      var org = (res && res.org) || null;
      var checks = {};
      ((org && org.fields) || []).forEach(function (f) {
        checks[f.key] = false;
      });
      that.setData({
        org: org,
        broken: !!(org && !org.complete),
        checks: checks,
      });
    });
    nav.delay(16, function () {
      that.setData({ phase: 'in' });
    });
  },

  onShow: function () {
    var ticket = shell.takePendingCertify();
    try {
      var g = getApp().globalData.certifyTicket;
      if (!ticket && g) ticket = g;
      getApp().globalData.certifyTicket = null;
    } catch (e) {}

    if (ticket && this.data.awaitingCertify) {
      this.setData({ awaitingCertify: false });
      if (ticket.ok && ticket.action === 'consent') {
        this.finishAllow();
      }
    }
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

  allow90: function () {
    if (!this.data.canAllow) return;
    haptics.paper();
    this.setData({ days90: true, awaitingCertify: true });
    platform.navigateTo('/pages/certify/certify?action=consent');
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
      platform.redirectTo('/pages/result/result?kind=deny');
    });
  },

  allow: function () {
    if (!this.data.canAllow) return;
    haptics.paper();
    this.setData({ awaitingCertify: true });
    platform.navigateTo('/pages/certify/certify?action=consent');
  },

  finishAllow: function () {
    var that = this;
    var org = this.data.org;
    var checks = this.data.checks;
    var granted = [];
    Object.keys(checks).forEach(function (k) {
      if (checks[k]) granted.push(k);
    });
    cloud
      .call('consentAdd', {
        org: org.name,
        fields: granted.join('、'),
        days90: !!that.data.days90,
      })
      .then(function () {
        that.leave(function () {
          platform.redirectTo(
            '/pages/result/result?kind=grant&granted=' + encodeURIComponent(granted.join(','))
          );
        });
      });
  },

  timeoutDemo: function () {
    this.leave(function () {
      platform.redirectTo('/pages/result/result?kind=deny');
    });
  },
});
