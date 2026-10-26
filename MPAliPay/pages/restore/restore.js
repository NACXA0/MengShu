var nav = require('../../utils/nav');
var vaultLib = require('../../utils/vault');
var vaultSession = require('../../utils/vaultSession');
var platform = require('../../utils/platform');
var haptics = require('../../utils/haptics');

Page({
  data: {
    layout: {},
    mnemonic: '',
    pass: '',
    message: '',
  },

  onLoad: function () {
    this.setData({ layout: nav.getNavLayout() });
  },

  onMnemonic: function (e) {
    this.setData({ mnemonic: (e.detail && e.detail.value) || '' });
  },

  onPass: function (e) {
    this.setData({ pass: (e.detail && e.detail.value) || '' });
  },

  restore: function () {
    haptics.paper();
    var v = vaultLib.createEmptyVault();
    var r = vaultLib.restoreFromMnemonic(v, this.data.mnemonic, this.data.pass);
    if (!r.ok) {
      this.setData({ message: r.message });
      return;
    }
    vaultSession.setSessionPass(this.data.pass);
    vaultSession.persist(v);
    this.setData({ message: '已恢复（关系列表为空，除非你另行导入）' });
    setTimeout(function () {
      platform.navigateBack(1);
    }, 600);
  },
});
