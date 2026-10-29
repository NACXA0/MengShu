var nav = require('../../utils/nav');
var vaultLib = require('../../utils/vault');
var vaultSession = require('../../utils/vaultSession');
var platform = require('../../utils/platform');
var haptics = require('../../utils/haptics');

Page({
  data: {
    layout: {},
    mnemonic: '',
    note: '',
    message: '',
  },

  onLoad: function () {
    this.setData({ layout: nav.getNavLayout() });
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
