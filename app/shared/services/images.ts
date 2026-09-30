/** Width and height from a PNG or JPEG header, or null when unreadable. */
export function imageSize(data: Uint8Array): { width: number; height: number } | null {
  if (data.length > 24 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    let view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    return { width: view.getUint32(16), height: view.getUint32(20) };
  }

  if (data.length > 4 && data[0] === 0xff && data[1] === 0xd8) {
    let i = 2;

    while (i + 9 < data.length) {
      if (data[i] !== 0xff) {
        i++;
        continue;
      }

      let marker = data[i + 1];
      let length = (data[i + 2] << 8) | data[i + 3];

      // SOF0 to SOF15 carry the frame size, except DHT, JPG and DAC.
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: (data[i + 5] << 8) | data[i + 6], width: (data[i + 7] << 8) | data[i + 8] };
      }

      i += 2 + length;
    }
  }

  return null;
}
