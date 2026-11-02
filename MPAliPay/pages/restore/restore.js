var vaultLib = require('../../utils/vault');
var vaultSession = require('../../utils/vaultSession');
var platform = require('../../utils/platform');
var haptics = require('../../utils/haptics');

Page({
  depthPage: true,
  data: {
    mnemonic: '',
    pass: '',
    message: '',
  },

  onLoad: function () {},

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
    this.setData({ message: '' });
    platform.showToast('已恢复');
    setTimeout(function () {
      platform.navigateBack(1);
    }, 600);
  },
});
