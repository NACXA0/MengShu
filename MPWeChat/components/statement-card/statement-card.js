Component({
  properties: {
    statements: { type: Array, value: [] },
  },
  data: {
    left: { empty: true, body: '' },
    right: { empty: true, body: '' },
  },
  lifetimes: {
    attached: function () {
      this.applyList(this.data.statements);
    },
  },
  observers: {
    statements: function (list) {
      this.applyList(list);
    },
  },
  methods: {
    applyList: function (list) {
      var a = null;
      var b = null;
      (list || []).forEach(function (s) {
        if (s.side === 'A') a = s;
        if (s.side === 'B') b = s;
      });
      var emptyBoth = !a && !b;
      this.setData({
        left: a || { empty: true, body: emptyBoth ? '双方均未提交陈述' : '对方已提交陈述，你未提交' },
        right: b || { empty: true, body: emptyBoth ? '双方均未提交陈述' : '对方已提交陈述，你未提交' },
      });
    },
  },
});
