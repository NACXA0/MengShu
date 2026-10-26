var theme = require('../../utils/theme');

var SRC = {
  meng: '/assets/seals/meng-gold.png',
  'meng-night': '/assets/seals/meng-gold-night.png',
  yanqi: '/assets/seals/yanqi-green.png',
  zhengwei: '/assets/seals/zhengwei-vermilion.png',
  shouli: '/assets/seals/shouli-green.png',
};

Component({
  props: {
    kind: 'meng',
    size: 96,
    drop: false,
  },
  data: {
    src: SRC.meng,
    size: 96,
    drop: false,
  },
  didMount: function () {
    this.sync(this.props);
  },
  deriveDataFromProps: function (next) {
    this.sync(next || this.props);
  },
  methods: {
    sync: function (p) {
      p = p || {};
      var kind = p.kind || 'meng';
      var src = SRC[kind] || SRC.meng;
      if (kind === 'meng' && theme.resolveEffective() === 'dark') {
        src = SRC['meng-night'];
      }
      this.setData({
        src: src,
        size: Number(p.size) || 96,
        drop: !!p.drop,
      });
    },
  },
});
