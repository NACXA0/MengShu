var nav = require('../../utils/nav');
var theme = require('../../utils/theme');
var platform = require('../../utils/platform');
var cloud = require('../../utils/cloud');
var shell = require('../../utils/shell');
var vaultSession = require('../../utils/vaultSession');
var haptics = require('../../utils/haptics');

Page({
  data: {
    layout: {},
    appearance: '跟随系统',
    consents: [],
    resetLabel: '重置本地演示仓',
    resetArmed: false,
    openIdHint: '',
    certifyDown: false,
    hasSession: false,
    awaitingLogout: false,
    samples: [
      { id: 'pb_lin', title: '林晚', sub: '演示样本，正式产品只能靠链接到达' },
      { id: 'pb_zhou', title: '周南', sub: '未宣誓 · 双方均未提交陈述' },
      { id: 'pb_one', title: '陈启', sub: '仅一方陈述' },
      { id: 'pb_false', title: '吴昭', sub: '虚假宣誓记录' },
      { id: 'pb_off', title: '沈予', sub: '公示已撤下' },
    ],
    codes: [
      { id: 'MS-VALID', title: 'MS-VALID', sub: '有效一次' },
      { id: 'MS-EXPIRED', title: 'MS-EXPIRED', sub: '已过期' },
    ],
    orgs: [
      { id: 'org_seed', title: '临川婚介', sub: '六要素齐全' },
      { id: 'org_broken', title: '未具名机构', sub: '缺联系方式' },
    ],
  },

  onLoad: function () {
    this.setData({ layout: nav.getNavLayout() });
  },

  onShow: function () {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setSelected(2);
    }

    var ticket = shell.takePendingCertify();
    try {
      var g = getApp().globalData.certifyTicket;
      if (!ticket && g) ticket = g;
      getApp().globalData.certifyTicket = null;
    } catch (e) {}

    if (ticket && this.data.awaitingLogout) {
      this.setData({ awaitingLogout: false });
      if (ticket.ok && ticket.action === 'logout') {
        this.finishLogout();
      }
    }

    this.refreshSession();
    this.setData({ appearance: theme.labelFor(theme.getPreference()) });
    var that = this;
    cloud.call('consentList', {}).then(function (res) {
      that.setData({ consents: (res && res.consents) || [] });
    });
  },

  refreshSession: function () {
    var session = getApp().globalData.session;
    var that = this;
    this.setData({
      hasSession: !!(session && session.openId),
      openIdHint: session && session.openId ? session.openId : cloud.getLocalOpenId(),
    });
    cloud.call('certifyCheck', { action: 'status' }).then(function (r) {
      that.setData({ certifyDown: !!(r && r.reason === 'service_down') });
    });
  },

  openPlaza: function (e) {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().conceal(false);
    }
    platform.navigateTo('/pages/plaza/plaza?id=' + e.currentTarget.dataset.id);
  },

  fillCode: function (e) {
    getApp().globalData.pendingCode = e.currentTarget.dataset.id;
    platform.switchTab('/pages/verify/verify');
  },

  openOrg: function (e) {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().conceal(true);
    }
    platform.navigateTo('/pages/consent/consent?org=' + e.currentTarget.dataset.id);
  },

  openBoundary: function () {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().conceal(true);
    }
    platform.navigateTo('/pages/boundary/boundary');
  },

  cycleTheme: function () {
    var cur = theme.getPreference();
    var next = cur === 'system' ? 'light' : cur === 'light' ? 'dark' : 'system';
    theme.setPreference(next);
    theme.applyToPage(this, false);
    this.setData({ appearance: theme.labelFor(next) });
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ tone: theme.iconTone(), themeClass: theme.resolveClass() });
    }
  },

  toggleCertifyDown: function () {
    haptics.paper();
    var that = this;
    var next = !this.data.certifyDown;
    cloud.call('demoSetCertifyDown', { down: next }).then(function (res) {
      that.setData({ certifyDown: !!(res && res.certifyDown) });
    });
  },

  clearSessionKeepBound: function () {
    haptics.paper();
    getApp().setSession(null);
    vaultSession.clearSession();
    this.refreshSession();
    platform.redirectTo('/pages/gate/gate');
  },

  startLogout: function () {
    if (!this.data.hasSession) return;
    haptics.paper();
    this.setData({ awaitingLogout: true });
    platform.navigateTo('/pages/certify/certify?action=logout');
  },

  finishLogout: function () {
    var that = this;
    cloud.call('authLogout', {}).then(function (res) {
      if (!res || !res.ok) return;
      getApp().setSession(null);
      vaultSession.clearSession();
      that.refreshSession();
      platform.redirectTo('/pages/gate/gate');
    });
  },

  reset: function () {
    if (!this.data.resetArmed) {
      this.setData({ resetArmed: true, resetLabel: '再次点击以重置' });
      var that = this;
      setTimeout(function () {
        that.setData({ resetArmed: false, resetLabel: '重置本地演示仓' });
      }, 2500);
      return;
    }
    shell.resetShell();
    vaultSession.clearSession();
    cloud.resetLocal();
    getApp().setSession(null);
    this.setData({
      resetArmed: false,
      resetLabel: '重置本地演示仓',
      consents: [],
    });
    this.refreshSession();
  },
});
