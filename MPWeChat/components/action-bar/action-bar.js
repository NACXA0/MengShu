Component({
  properties: {
    leftText: { type: String, value: '' },
    rightText: { type: String, value: '' },
    rightFill: { type: Boolean, value: false },
    rightDisabled: { type: Boolean, value: false },
    single: { type: String, value: '' },
    singleDisabled: { type: Boolean, value: false },
  },
  methods: {
    onLeft: function () {
      this.triggerEvent('left');
    },
    onRight: function () {
      if (this.data.rightDisabled) return;
      this.triggerEvent('right');
    },
    onSingle: function () {
      if (this.data.singleDisabled) return;
      this.triggerEvent('single');
    },
  },
});
