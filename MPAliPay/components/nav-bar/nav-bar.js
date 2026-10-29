var nav = require('../../utils/nav');
var haptics = require('../../utils/haptics');
var theme = require('../../utils/theme');

Component({
  props: {
    title: '',
    showBack: false,
    plaza: false,
    report: false,
    depth: false,
    scrolled: false,
    zone: '',
    onBack: function () {},
    onReport: function () {},
  },
  data: {
    layout: {},
    tone: 'ink',
    title: '',
    showBack: false,
    plaza: false,
    report: false,
    depth: false,
    scrolled: false,
    zone: '',
    zoneLabel: '',
  },
  didMount: function () {
    this.syncProps(this.props);
  },
  deriveDataFromProps: function (next) {
    this.syncProps(next || this.props);
  },
  methods: {
    syncProps: function (p) {
      p = p || {};
      var zone = p.zone || '';
      if (!zone && p.plaza) zone = 'plaza';
      if (!zone && p.depth) zone = 'vault';
      var zoneLabel = '';
      if (zone === 'vault') zoneLabel = 'Vault';
      else if (zone === 'plaza') zoneLabel = 'Plaza';
      this.setData({
        layout: nav.getNavLayout(),
        tone: p.depth || zone === 'vault' ? 'night' : theme.iconTone(),
        title: p.title || '',
        showBack: !!p.showBack,
        plaza: !!p.plaza,
        report: !!p.report,
        depth: !!p.depth,
        scrolled: !!p.scrolled,
        zone: zone,
        zoneLabel: zoneLabel,
      });
    },
    onBackTap: function () {
      haptics.paper();
      if (typeof this.props.onBack === 'function') this.props.onBack();
      if (this.props.depth) return;
      nav.goBack();
    },
    onReportTap: function () {
      haptics.paper();
      if (typeof this.props.onReport === 'function') this.props.onReport();
    },
  },
});
