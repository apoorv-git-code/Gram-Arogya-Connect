'use strict';

// QR encoder vendored from qrcode-terminal's MIT-licensed QRCode implementation.
const QRCode = require('../vendor/QRCode');
const QRErrorCorrectLevel = require('../vendor/QRCode/QRErrorCorrectLevel');

function toSvg(text) {
  const qr = new QRCode(-1, QRErrorCorrectLevel.M);
  qr.addData(String(text));
  qr.make();
  const count = qr.getModuleCount();
  const quiet = 4;
  const size = count + quiet * 2;
  const paths = [];
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (qr.isDark(row, col)) paths.push(`M${col + quiet} ${row + quiet}h1v1h-1z`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${paths.join('')}" fill="#063f38"/></svg>`;
}

module.exports = { toSvg };
