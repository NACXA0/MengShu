var nav = require('../../utils/nav');
var platform = require('../../utils/platform');
var cloud = require('../../utils/cloud');
var vaultLib = require('../../utils/vault');
var vaultSession = require('../../utils/vaultSession');
var sign = require('../../utils/sign');
var shell = require('../../utils/shell');
var haptics = require('../../utils/haptics');

function fmtDate(ts) {
  var d = new Date(ts);
  var m = d.getMonth() + 1;
  var day = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
}

Page({
  data: {
    layout: {},
    unlocked: false,
    hasLock: false,
    pass: '',
    message: '',
    relations: [],
    overview: { count: 0, lastLabel: '', rootShort: '' },
    plaza: { on: false, band: '', publicId: '' },
    note: '口令与助记词仅存本机；关系档案经云函数读写。',
  },

  onLoad: function () {
    if (platform.hasMy() && typeof my.hideBackHome === 'function') {
      my.hideBackHome();
    }
    this.setData({ layout: nav.getNavLayout() });
  },

  onShow: function () {
    if (!getApp().ensureSessionOrGate()) {
      platform.reLaunch('/pages/gate/gate');
      return;
    }
    this.refreshLockUi();
    if (vaultLib.isUnlocked(vaultSession.loadUnlocked())) {
      this.loadRelations();
      this.loadPlaza();
    }
  },

  refreshLockUi: function () {
    var v = vaultSession.loadUnlocked();
    this.setData({
      unlocked: vaultLib.isUnlocked(v),
      hasLock: !!v.locked,
    });
  },

  loadRelations: function () {
    var that = this;
    var role = shell.getSignRole();
    cloud.call('relationList', {}).then(function (res) {
      var list = (res && res.ok && res.relations) || [];
      var views = list.map(function (r) {
        return sign.viewForRole(r, role);
      });
      var last = 0;
      for (var i = 0; i < list.length; i++) {
        if (list[i].status === sign.STATUS.SIGNED && list[i].updatedAt > last) last = list[i].updatedAt;
      }
      var root = sign.commitmentRoot(list);
      that._rootFull = root;
      that.setData({
        relations: views,
        unlocked: true,
        overview: {
          count: list.length,
          lastLabel: last ? '最近互证 ' + fmtDate(last) : '尚未互证',
          rootShort: root.slice(0, 8),
        },
      });
    });
  },

  loadPlaza: function () {
    var that = this;
    cloud.call('plazaGet', { id: 'me' }).then(function (res) {
      var p = (res && res.profile) || null;
      that.setData({
        plaza: {
          on: !!(p && !p.withdrawn),
          band: p ? p.band : '',
          publicId: p ? p.publicId : '',
        },
      });
    });
  },

  onPassInput: function (e) {
    this.setData({ pass: (e.detail && e.detail.value) || '' });
  },

  onLockAction: function () {
    if (this.data.hasLock) this.unlock();
    else this.setupLock();
  },

  setupLock: function () {
    haptics.paper();
    var v = shell.getVault();
    var r = vaultLib.setPassphrase(v, this.data.pass);
    if (!r.ok) {
      this.setData({ message: r.message });
      return;
    }
    vaultSession.setSessionPass(this.data.pass);
    vaultSession.persist(v);
    this.setData({ pass: '', message: '' });
    platform.showToast('口令已设置');
    this.refreshLockUi();
    this.loadRelations();
    this.loadPlaza();
  },

  unlock: function () {
    haptics.paper();
    var v = shell.getVault();
    var r = vaultLib.unlock(v, this.data.pass);
    if (!r.ok) {
      this.setData({ message: r.message });
      return;
    }
    vaultSession.setSessionPass(this.data.pass);
    this.setData({ pass: '', message: '' });
    platform.showToast('已解锁');
    this.refreshLockUi();
    this.loadRelations();
    this.loadPlaza();
  },

  copyRoot: function () {
    if (!this._rootFull) return;
    platform.setClipboard(this._rootFull);
    platform.showToast('承诺根已复制');
  },

  openSign: function (e) {
    platform.navigateTo('/pages/sign/sign?id=' + e.currentTarget.dataset.id);
  },

  openPlaza: function () {
    platform.navigateTo('/pages/plaza/plaza?id=me');
  },

  openSettings: function () {
    platform.navigateTo('/pages/settings/settings');
  },

  onScan: function () {
    haptics.paper();
    var that = this;
    platform.scanCode(function (code) {
      if (code && /^MS-/i.test(String(code).trim())) {
        getApp().globalData.pendingCode = String(code).trim();
        platform.navigateTo('/pages/verify/verify');
      } else {
        that.showScanSheet();
      }
    });
  },

  showScanSheet: function () {
    var that = this;
    platform.actionSheet(
      {
        items: ['验证他人档案', '发起新关系', '加入对方发起的关系'],
      },
      function (idx) {
        if (idx === 0) {
          platform.navigateTo('/pages/verify/verify');
        } else if (idx === 1) {
          platform.navigateTo('/pages/add/add');
        } else if (idx === 2) {
          that.joinInvite();
        }
      }
    );
  },

  joinInvite: function () {
    var that = this;
    cloud.call('relationList', {}).then(function (res) {
      var list = (res && res.relations) || [];
      var invited = null;
      for (var i = 0; i < list.length; i++) {
        if (list[i].status === sign.STATUS.INVITED) {
          if (!invited || list[i].updatedAt > invited.updatedAt) invited = list[i];
        }
      }
      if (!invited) {
        platform.showToast('暂无可加入的邀请');
        return;
      }
      shell.setSignRole('B');
      platform.navigateTo('/pages/sign/sign?id=' + invited.id);
    });
  },
});
