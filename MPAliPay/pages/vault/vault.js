var nav = require('../../utils/nav');
var platform = require('../../utils/platform');
var cloud = require('../../utils/cloud');
var vaultLib = require('../../utils/vault');
var vaultSession = require('../../utils/vaultSession');
var sign = require('../../utils/sign');
var shell = require('../../utils/shell');
var haptics = require('../../utils/haptics');

Page({
  data: {
    layout: {},
    unlocked: false,
    hasLock: false,
    pass: '',
    message: '',
    relations: [],
    role: 'A',
    note: '口令与助记词仅存本机；关系档案经云函数读写。',
  },

  onLoad: function () {
    this.setData({ layout: nav.getNavLayout() });
  },

  onShow: function () {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setSelected(0);
    }
    if (!getApp().ensureSessionOrGate()) {
      platform.redirectTo('/pages/gate/gate');
      return;
    }
    this.refreshLockUi();
    if (vaultLib.isUnlocked(vaultSession.loadUnlocked())) {
      this.loadRelations();
    }
  },

  refreshLockUi: function () {
    var v = vaultSession.loadUnlocked();
    this.setData({
      unlocked: vaultLib.isUnlocked(v),
      hasLock: !!v.locked,
      role: shell.getSignRole(),
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
      that.setData({ relations: views, role: role, unlocked: true });
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
  },

  lockNow: function () {
    vaultSession.clearSession();
    this.setData({ relations: [] });
    this.refreshLockUi();
    platform.showToast('已锁定');
  },

  switchRole: function () {
    haptics.paper();
    var next = this.data.role === 'A' ? 'B' : 'A';
    shell.setSignRole(next);
    this.loadRelations();
  },

  startSign: function () {
    haptics.paper();
    var v = vaultSession.loadUnlocked();
    if (!vaultLib.isUnlocked(v)) {
      this.setData({ message: '请先解锁保险库' });
      return;
    }
    var that = this;
    var rel = sign.createInvite({ title: '演示关系' });
    cloud.call('relationSave', { relation: rel }).then(function (res) {
      if (!res || !res.ok) {
        that.setData({ message: (res && res.message) || '保存失败' });
        return;
      }
      platform.navigateTo('/pages/sign/sign?id=' + rel.id);
    });
  },

  openSign: function (e) {
    platform.navigateTo('/pages/sign/sign?id=' + e.currentTarget.dataset.id);
  },

  openBackup: function () {
    platform.navigateTo('/pages/backup/backup');
  },

  openRestore: function () {
    platform.navigateTo('/pages/restore/restore');
  },

  destroyVault: function () {
    haptics.paper();
    var that = this;
    platform.confirm(
      {
        title: '销毁保险库',
        content: '将清除本机口令与助记词派生密钥，不可恢复。确定继续？',
        confirmButtonText: '销毁',
        cancelButtonText: '取消',
      },
      function (ok) {
        if (!ok) return;
        var v = vaultSession.loadUnlocked();
        vaultLib.destroy(v);
        vaultSession.clearSession();
        vaultSession.persist(v);
        that.setData({ message: '', relations: [] });
        that.refreshLockUi();
        platform.showToast('保险库已销毁');
      }
    );
  },
});
