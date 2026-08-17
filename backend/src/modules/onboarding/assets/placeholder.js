/**
 * Generate a simple solid-color PNG (no external deps) for starter product images.
 * Honest placeholders — not product photography.
 */

const zlib = require('zlib');

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/**
 * @param {object} opts
 * @param {number} [opts.width=128]
 * @param {number} [opts.height=128]
 * @param {[number,number,number]} [opts.rgb=[37,99,235]]
 * @returns {Buffer}
 */
function generatePlaceholderPng({ width = 128, height = 128, rgb = [37, 99, 235] } = {}) {
  const [r, g, b] = rgb;
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x += 1) {
    const i = 1 + x * 3;
    row[i] = r;
    row[i + 1] = g;
    row[i + 2] = b;
  }
  const raw = Buffer.concat(Array.from({ length: height }, () => Buffer.from(row)));
  const compressed = zlib.deflateSync(raw);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const TYPE_COLORS = {
  retail: [37, 99, 235],
  restaurant: [234, 88, 12],
  grocery: [22, 163, 74],
  fashion: [219, 39, 119],
  electronics: [14, 165, 233],
  beauty: [168, 85, 247],
  pharmacy: [13, 148, 136],
  wholesale: [100, 116, 139],
  general: [79, 70, 229],
};

function placeholderForType(businessType) {
  const rgb = TYPE_COLORS[businessType] || TYPE_COLORS.general;
  const buffer = generatePlaceholderPng({ width: 160, height: 160, rgb });
  return {
    buffer,
    originalname: `ob-${businessType}-placeholder.png`,
    size: buffer.length,
    mimetype: 'image/png',
  };
}

module.exports = {
  generatePlaceholderPng,
  placeholderForType,
  TYPE_COLORS,
};
