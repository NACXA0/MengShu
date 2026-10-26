var platform = require('./platform');

function paper() {
  platform.vibrateShort();
}

function seal() {
  platform.vibrateShort();
}

function door() {
  platform.vibrateShort();
}

module.exports = {
  paper: paper,
  seal: seal,
  door: door,
};
