var theme = require('../../utils/theme');

Component({
  props: {
    name: 'shield',
    size: 48,
    tone: '',
  },
  data: {
    src: '',
    size: 48,
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
      var name = p.name || 'shield';
      var tone = p.tone;
      if (!tone) tone = theme.iconTone();
      var file = name === 'x' ? 'x-alert' : name + '-' + tone;
      if (name === 'x') file = 'x-alert';
      this.setData({
        src: '/assets/icons/' + file + '.png',
        size: Number(p.size) || 48,
      });
    },
  },
});
