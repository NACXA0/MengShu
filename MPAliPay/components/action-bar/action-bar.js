Component({
  props: {
    leftText: '',
    rightText: '',
    rightFill: false,
    rightDisabled: false,
    single: '',
    singleDisabled: false,
    onLeft: function () {},
    onRight: function () {},
    onSingle: function () {},
  },
  data: {
    leftText: '',
    rightText: '',
    rightFill: false,
    rightDisabled: false,
    single: '',
    singleDisabled: false,
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
        leftText: p.leftText || '',
        rightText: p.rightText || '',
        rightFill: !!p.rightFill,
        rightDisabled: !!p.rightDisabled,
        single: p.single || '',
        singleDisabled: !!p.singleDisabled,
      });
    },
    onLeftTap: function () {
      if (typeof this.props.onLeft === 'function') this.props.onLeft();
    },
    onRightTap: function () {
      if (this.props.rightDisabled) return;
      if (typeof this.props.onRight === 'function') this.props.onRight();
    },
    onSingleTap: function () {
      if (this.props.singleDisabled) return;
      if (typeof this.props.onSingle === 'function') this.props.onSingle();
    },
  },
});
