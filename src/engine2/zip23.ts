// CHLOE MATH 2.3 — 무의존 ZIP (store 방식, 압축 없음) writer/reader.
// 백업/분석 패키지 전용: 외부 라이브러리 없이 브라우저·Node 양쪽에서 동작한다.
// 압축을 하지 않는 이유: (a) 의존성 0 (b) 바이트 결정성(체크섬 안정) (c) 학습 데이터
// 규모(수 MB)에서 압축 이득보다 단순성·검증 가능성이 중요하다.

const te = new TextEncoder();
const td = new TextDecoder();

// CRC-32 (IEEE) — ZIP 필수 필드
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// 수 MB 규모의 이벤트 로그에서 배열 spread는 호출 스택을 넘긴다(브라우저 실측) —
// 성장형 바이트 버퍼에 직접 복사한다.
class ByteWriter {
  private buf = new Uint8Array(1 << 16);
  private len = 0;
  private ensure(n: number) {
    if (this.len + n <= this.buf.length) return;
    let cap = this.buf.length * 2;
    while (cap < this.len + n) cap *= 2;
    const next = new Uint8Array(cap);
    next.set(this.buf.subarray(0, this.len));
    this.buf = next;
  }
  get length() {
    return this.len;
  }
  bytes(data: Uint8Array) {
    this.ensure(data.length);
    this.buf.set(data, this.len);
    this.len += data.length;
  }
  u16(v: number) {
    this.ensure(2);
    this.buf[this.len++] = v & 0xff;
    this.buf[this.len++] = (v >>> 8) & 0xff;
  }
  u32(v: number) {
    this.ensure(4);
    this.buf[this.len++] = v & 0xff;
    this.buf[this.len++] = (v >>> 8) & 0xff;
    this.buf[this.len++] = (v >>> 16) & 0xff;
    this.buf[this.len++] = (v >>> 24) & 0xff;
  }
  done(): Uint8Array {
    return this.buf.slice(0, this.len);
  }
}

// files: 경로 → UTF-8 문자열 내용. 결정성: 호출자가 넘긴 삽입 순서 그대로 기록.
export function zipStore(files: Record<string, string>): Uint8Array {
  const w = new ByteWriter();
  const central = new ByteWriter();
  let count = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = te.encode(name);
    const data = te.encode(content);
    const crc = crc32(data);
    const offset = w.length;
    // local file header
    w.u32(0x04034b50);
    w.u16(20);
    w.u16(0x0800); // UTF-8 flag
    w.u16(0); // store (무압축)
    w.u16(0);
    w.u16(0); // time/date 0 — 결정성
    w.u32(crc);
    w.u32(data.length);
    w.u32(data.length);
    w.u16(nameBytes.length);
    w.u16(0);
    w.bytes(nameBytes);
    w.bytes(data);
    // central directory entry
    central.u32(0x02014b50);
    central.u16(20);
    central.u16(20);
    central.u16(0x0800);
    central.u16(0);
    central.u16(0);
    central.u16(0);
    central.u32(crc);
    central.u32(data.length);
    central.u32(data.length);
    central.u16(nameBytes.length);
    central.u16(0);
    central.u16(0);
    central.u16(0);
    central.u16(0);
    central.u32(0);
    central.u32(offset);
    central.bytes(nameBytes);
    count++;
  }
  const centralOffset = w.length;
  const centralBytes = central.done();
  w.bytes(centralBytes);
  // end of central directory
  w.u32(0x06054b50);
  w.u16(0);
  w.u16(0);
  w.u16(count);
  w.u16(count);
  w.u32(centralBytes.length);
  w.u32(centralOffset);
  w.u16(0);
  return w.done();
}

// store 방식 zip 해석 — 우리가 만든 백업만 대상으로 하며, 압축 엔트리는 명시 거부.
export function zipRead(bytes: Uint8Array): Record<string, string> {
  const files: Record<string, string> = {};
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = 0;
  while (p + 4 <= bytes.length) {
    const sig = dv.getUint32(p, true);
    if (sig !== 0x04034b50) break; // central directory 도달
    const method = dv.getUint16(p + 8, true);
    const crcStored = dv.getUint32(p + 14, true);
    const size = dv.getUint32(p + 18, true);
    const nameLen = dv.getUint16(p + 26, true);
    const extraLen = dv.getUint16(p + 28, true);
    const name = td.decode(bytes.subarray(p + 30, p + 30 + nameLen));
    if (method !== 0) throw new Error(`압축된 엔트리는 지원하지 않습니다: ${name} (method=${method})`);
    const dataStart = p + 30 + nameLen + extraLen;
    const data = bytes.subarray(dataStart, dataStart + size);
    if (crc32(data) !== crcStored) throw new Error(`CRC 불일치 — 손상된 파일: ${name}`);
    files[name] = td.decode(data);
    p = dataStart + size;
  }
  if (Object.keys(files).length === 0) throw new Error('ZIP에서 파일을 찾지 못했습니다 (형식 불일치 또는 손상)');
  return files;
}

// SHA-256 (integrity.json용) — 브라우저·Node 공통 Web Crypto
export async function sha256Hex(content: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', te.encode(content));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
