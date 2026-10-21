/**
 * 触觉只保留三种：按压轻、印落中、门推不动中。
 */
function paper() {
  try {
    wx.vibrateShort({ type: 'light' });
  } catch (e) {}
}

function seal() {
  try {
    wx.vibrateShort({ type: 'medium' });
  } catch (e) {}
}

function door() {
  try {
    wx.vibrateShort({ type: 'medium' });
  } catch (e) {}
}

module.exports = {
  paper: paper,
  seal: seal,
  door: door,
};
