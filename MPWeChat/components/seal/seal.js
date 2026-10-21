var theme = require('../../utils/theme');

var SRC = {
  meng: '/assets/seals/meng-gold.png',
  'meng-night': '/assets/seals/meng-gold-night.png',
  yanqi: '/assets/seals/yanqi-green.png',
  zhengwei: '/assets/seals/zhengwei-vermilion.png',
  shouli: '/assets/seals/shouli-green.png',
};

Component({
  properties: {
    kind: { type: String, value: 'meng' },
    size: { type: Number, value: 96 },
    drop: { type: Boolean, value: false },
  },
  data: {
    src: SRC.meng,
  },
  lifetimes: {
    attached: function () {
      this.sync();
    },
  },
  observers: {
    kind: function () {
      this.sync();
    },
  },
  methods: {
    sync: function () {
      var kind = this.data.kind || 'meng';
      if (kind === 'meng' && theme.resolveEffective() === 'dark') {
        this.setData({ src: SRC['meng-night'] });
        return;
      }
      this.setData({ src: SRC[kind] || SRC.meng });
    },
  },
});
