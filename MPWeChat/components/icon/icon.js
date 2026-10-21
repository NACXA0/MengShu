var theme = require('../../utils/theme');

Component({
  properties: {
    name: { type: String, value: 'shield' },
    size: { type: Number, value: 48 },
    tone: { type: String, value: '' },
  },
  data: {
    src: '',
  },
  lifetimes: {
    attached: function () {
      this.sync();
    },
  },
  observers: {
    'name, size, tone': function () {
      this.sync();
    },
  },
  methods: {
    sync: function () {
      var name = this.data.name || 'shield';
      var tone = this.data.tone;
      if (!tone) tone = theme.iconTone();
      var file = name === 'x' ? 'x-alert' : name + '-' + (name === 'x' ? 'alert' : tone);
      if (name === 'x') file = 'x-alert';
      this.setData({ src: '/assets/icons/' + file + '.png' });
    },
  },
});
