import { inflateRawSync } from 'node:zlib';

/**
 * Lee una entrada de un zip completo, para comprobar lo que exporta la API (un .xlsx es un zip). Usa
 * el directorio central, que trae los tamaños aunque la entrada se haya escrito por partes.
 */
export function readZipEntry(zip: Buffer, name: string): string {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) throw new Error('No es un zip');
  const entries = zip.readUInt16LE(end + 10);
  let offset = zip.readUInt32LE(end + 16);
  for (let index = 0; index < entries; index += 1) {
    const method = zip.readUInt16LE(offset + 10);
    const size = zip.readUInt32LE(offset + 20);
    const nameLength = zip.readUInt16LE(offset + 28);
    const skip = nameLength + zip.readUInt16LE(offset + 30) + zip.readUInt16LE(offset + 32);
    const local = zip.readUInt32LE(offset + 42);
    if (zip.toString('utf8', offset + 46, offset + 46 + nameLength) === name) {
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const data = zip.subarray(start, start + size);
      return (method === 8 ? inflateRawSync(data) : data).toString('utf8');
    }
    offset += 46 + skip;
  }
  throw new Error(`El zip no tiene ${name}`);
}
