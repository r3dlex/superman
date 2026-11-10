import assert from "node:assert/strict";
import { test } from "node:test";
import { deflateRawSync } from "node:zlib";
import { zipContent, zipEntries, zipEntry } from "./extract-zip.ts";

/**
 * A zip archive holding one entry, written the way a release archive is.
 *
 * The archive is built here rather than checked in, so the test cannot drift
 * from the format it claims to read, and no binary fixture is needed.
 */
function buildZip(name: string, content: Buffer, method: 0 | 8): Buffer {
  const compressed = method === 0 ? content : deflateRawSync(content);
  const nameBytes = Buffer.from(name, "utf8");
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // the version needed to extract
  local.writeUInt16LE(0, 6); // no flags
  local.writeUInt16LE(method, 8);
  local.writeUInt16LE(0, 10); // the time
  local.writeUInt16LE(0, 12); // the date
  local.writeUInt32LE(0, 14); // the crc, which this reader does not use
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(content.length, 22);
  local.writeUInt16LE(nameBytes.length, 26);
  local.writeUInt16LE(0, 28);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4); // the version made by
  central.writeUInt16LE(20, 6); // the version needed
  central.writeUInt16LE(0, 8); // no flags
  central.writeUInt16LE(method, 10);
  central.writeUInt16LE(0, 12); // the time
  central.writeUInt16LE(0, 14); // the date
  central.writeUInt32LE(0, 16); // the crc
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(content.length, 24);
  central.writeUInt16LE(nameBytes.length, 28);
  central.writeUInt16LE(0, 30); // the extra length
  central.writeUInt16LE(0, 32); // the comment length
  central.writeUInt16LE(0, 34); // the disk number
  central.writeUInt16LE(0, 36); // the internal attributes
  central.writeUInt32LE(0, 38); // the external attributes
  central.writeUInt32LE(0, 42); // the local header's offset
  const body = Buffer.concat([local, nameBytes, compressed]);
  const centralBytes = Buffer.concat([central, nameBytes]);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(1, 8); // the entry count
  end.writeUInt16LE(1, 10); // the entry count
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(body.length, 16);
  end.writeUInt16LE(0, 20); // the comment length
  return Buffer.concat([body, centralBytes, end]);
}

test("the archive's entries are read with their names and sizes", () => {
  const archive = buildZip("deno", Buffer.from("the runtime\n"), 8);
  const entries = zipEntries(archive);
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.name, "deno");
  assert.equal(entries[0]?.method, 8);
  assert.equal(entries[0]?.uncompressedSize, 12);
});

test("a deflated entry is inflated to its recorded content", () => {
  const content = Buffer.from("the runtime\n");
  const archive = buildZip("deno", content, 8);
  const entry = zipEntry(archive, "deno");
  assert.ok(entry);
  assert.deepEqual(zipContent(archive, entry), content);
});

test("a stored entry is read without inflating it", () => {
  const content = Buffer.from("the runtime\n");
  const archive = buildZip("deno", content, 0);
  const entry = zipEntry(archive, "deno");
  assert.ok(entry);
  assert.deepEqual(zipContent(archive, entry), content);
});

test("an entry that is not there is not invented", () => {
  const archive = buildZip("deno", Buffer.from("x"), 0);
  assert.equal(zipEntry(archive, "denort"), undefined);
});

test("an archive that is not a zip is refused", () => {
  assert.throws(() => zipEntries(Buffer.from("not a zip at all")), /not a zip/u);
});

test("an unsupported compression method is refused rather than guessed at", () => {
  const archive = buildZip("deno", Buffer.from("x"), 0);
  const entry = zipEntry(archive, "deno");
  assert.ok(entry);
  const broken = { ...entry, method: 99 };
  assert.throws(() => zipContent(archive, broken), /unsupported compression method/u);
});
