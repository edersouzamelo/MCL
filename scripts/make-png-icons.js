/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createCrcTable() {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCrcTable();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'binary');
  const crcBuf = Buffer.alloc(4);
  const typeAndData = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crcBuf]);
}

function generateHighContrastPng(width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const headerChunk = makeChunk('IHDR', ihdr);

  // Colors
  const emerald = [5, 150, 105, 255]; // #059669
  const white = [255, 255, 255, 255]; // #ffffff
  const borderSize = Math.max(4, Math.floor(width * 0.05));
  const cornerRadius = Math.floor(width * 0.2);

  const rawData = Buffer.alloc(height * (width * 4 + 1));
  let pos = 0;

  for (let y = 0; y < height; y++) {
    rawData[pos++] = 0; // Filter type 0
    for (let x = 0; x < width; x++) {
      let isBorder = false;
      let isCornerOut = false;

      // Rounded corners math
      let dx = 0, dy = 0;
      if (x < cornerRadius) dx = cornerRadius - x;
      else if (x >= width - cornerRadius) dx = x - (width - cornerRadius - 1);

      if (y < cornerRadius) dy = cornerRadius - y;
      else if (y >= height - cornerRadius) dy = y - (height - cornerRadius - 1);

      if (dx > 0 && dy > 0) {
        if (Math.hypot(dx, dy) > cornerRadius) {
          isCornerOut = true;
        }
      }

      if (
        x < borderSize ||
        x >= width - borderSize ||
        y < borderSize ||
        y >= height - borderSize ||
        (dx > 0 && dy > 0 && Math.hypot(dx, dy) >= cornerRadius - borderSize)
      ) {
        isBorder = true;
      }

      let color;
      if (isCornerOut) {
        color = [0, 0, 0, 0]; // Transparent
      } else if (isBorder) {
        color = white;
      } else {
        color = emerald;
      }

      rawData[pos++] = color[0];
      rawData[pos++] = color[1];
      rawData[pos++] = color[2];
      rawData[pos++] = color[3];
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const dataChunk = makeChunk('IDAT', compressedData);
  const endChunk = makeChunk('IEND', Buffer.alloc(0));

  const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([pngHeader, headerChunk, dataChunk, endChunk]);
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
const publicDir = path.join(__dirname, '..', 'public');

const png512 = generateHighContrastPng(512, 512);
const png192 = generateHighContrastPng(192, 192);

fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), png512);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), png192);
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), png192);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), png192);

console.log("Successfully generated high contrast Emerald Green & White PWA PNG icons!");
