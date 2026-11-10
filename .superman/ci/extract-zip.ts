// Extract one entry from a zip archive, using only Node's built-ins.
//
// The pinned Deno release ships as a zip. Extracting it with an external
// `unzip` makes the tool install depend on whatever the runner happens to
// have: the macOS and Linux images ship one, and the self-hosted arm64
// runner does not. This module removes that dependency, so the archive is
// extracted the same way on every platform, and the extraction is covered by
// the repository's own tests rather than by a runner's image.
import { inflateRawSync } from "node:zlib";

/** A zip entry, as the central directory records it. */
export type ZipEntry = {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
};

const LOCAL_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const END_SIGNATURE = 0x06054b50;

function u16(bytes: Buffer, at: number): number {
  return bytes.readUInt16LE(at);
}
function u32(bytes: Buffer, at: number): number {
  return bytes.readUInt32LE(at);
}

/** The central directory's entries, in the order the archive records them. */
export function zipEntries(archive: Buffer): ZipEntry[] {
  // The end-of-central-directory record is at the tail; its comment length
  // gives the record's own size, so the search is bounded by it.
  let end = -1;
  for (let at = archive.length - 22; at >= 0 && at >= archive.length - 22 - 0xffff; at -= 1) {
    if (u32(archive, at) === END_SIGNATURE) {
      end = at;
      break;
    }
  }
  if (end < 0) throw new Error("the archive is not a zip: no end-of-central-directory record");
  const count = u16(archive, end + 10);
  let at = u32(archive, end + 16);
  const entries: ZipEntry[] = [];
  for (let index = 0; index < count; index += 1) {
    if (u32(archive, at) !== CENTRAL_SIGNATURE) throw new Error("the archive's central directory is malformed");
    const nameLength = u16(archive, at + 28);
    const extraLength = u16(archive, at + 30);
    const commentLength = u16(archive, at + 32);
    entries.push({
      name: archive.subarray(at + 46, at + 46 + nameLength).toString("utf8"),
      method: u16(archive, at + 10),
      compressedSize: u32(archive, at + 20),
      uncompressedSize: u32(archive, at + 24),
      localOffset: u32(archive, at + 42),
    });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/**
 * One entry's content, inflated.
 *
 * Only the two methods a release archive uses are read: stored (0) and
 * deflated (8). Anything else is refused rather than guessed at.
 */
export function zipContent(archive: Buffer, entry: ZipEntry): Buffer {
  if (u32(archive, entry.localOffset) !== LOCAL_SIGNATURE)
    throw new Error(`the archive's local header for ${entry.name} is malformed`);
  const nameLength = u16(archive, entry.localOffset + 26);
  const extraLength = u16(archive, entry.localOffset + 28);
  const start = entry.localOffset + 30 + nameLength + extraLength;
  const raw = archive.subarray(start, start + entry.compressedSize);
  const content = entry.method === 0 ? Buffer.from(raw) : entry.method === 8 ? inflateRawSync(raw) : undefined;
  if (!content) throw new Error(`unsupported compression method ${entry.method} for ${entry.name}`);
  if (content.length !== entry.uncompressedSize)
    throw new Error(`the archive's entry ${entry.name} does not hold its recorded size`);
  return content;
}

/** The entry with the given name, or undefined. */
export function zipEntry(archive: Buffer, name: string): ZipEntry | undefined {
  return zipEntries(archive).find((entry) => entry.name === name);
}
