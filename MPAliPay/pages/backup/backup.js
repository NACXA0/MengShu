var vaultLib = require('../../utils/vault');
var vaultSession = require('../../utils/vaultSession');
var platform = require('../../utils/platform');
var haptics = require('../../utils/haptics');

Page({
  depthPage: true,
  data: {
    mnemonic: '',
    note: '',
    message: '',
  },

  onLoad: function () {
    var v = vaultSession.loadUnlocked();
    var r = vaultLib.exportBackup(v);
    if (!r.ok) {
      this.setData({ message: r.message });
      return;
    }
    this.setData({ mnemonic: r.mnemonic, note: r.note });
  },

  copy: function () {
    haptics.paper();
    platform.setClipboard(this.data.mnemonic);
    this.setData({ message: '' });
    platform.showToast('已复制');
  },
});
