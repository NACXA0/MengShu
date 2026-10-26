Component({
  props: {
    rows: [],
  },
  data: {
    rows: [],
  },
  didMount: function () {
    this.setData({ rows: this.props.rows || [] });
  },
  deriveDataFromProps: function (next) {
    this.setData({ rows: (next && next.rows) || [] });
  },
});
