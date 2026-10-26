var nav = require('../../utils/nav');
var haptics = require('../../utils/haptics');
var theme = require('../../utils/theme');

Component({
  props: {
    title: '',
    showBack: false,
    plaza: true,
    report: false,
    depth: false,
    scrolled: false,
    onBack: function () {},
    onReport: function () {},
  },
  data: {
    layout: {},
    tone: 'ink',
    title: '',
    showBack: false,
    plaza: true,
    report: false,
    depth: false,
    scrolled: false,
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
      this.setData({
        layout: nav.getNavLayout(),
        tone: p.depth ? 'night' : theme.iconTone(),
        title: p.title || '',
        showBack: !!p.showBack,
        plaza: p.plaza !== false,
        report: !!p.report,
        depth: !!p.depth,
        scrolled: !!p.scrolled,
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
