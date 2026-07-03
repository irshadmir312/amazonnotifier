import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET() {
  try {
    const extensionDir = path.join(process.cwd(), "chrome-extension");

    // Read all extension files
    const files: Record<string, Buffer> = {};
    const entries = await fs.readdir(extensionDir, { withFileTypes: true });

    async function readDir(dirPath: string, basePath: string) {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        const entryPath = path.join(basePath, item.name);
        if (item.isDirectory()) {
          await readDir(fullPath, entryPath);
        } else {
          const content = await fs.readFile(fullPath);
          files[entryPath] = content;
        }
      }
    }

    await readDir(extensionDir, "");

    // Create a simple ZIP file manually (no external library needed)
    // Using a minimal ZIP implementation
    const zipBuffer = createZip(files);

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="amazon-jobs-monitor-extension.zip"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error creating extension zip:", error);
    return NextResponse.json(
      { error: "Failed to create extension package" },
      { status: 500 }
    );
  }
}

// Minimal ZIP file creator (no dependencies)
function createZip(files: Record<string, Buffer>): Buffer {
  const parts: Buffer[] = [];
  const centralDirectory: Buffer[] = [];
  let offset = 0;

  const entries = Object.entries(files).sort(([a], [b]) => a.localeCompare(b));

  for (const [filePath, content] of entries) {
    const fileName = Buffer.from(filePath, "utf8");
    const fileData = content;

    // Local file header
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(0, 8); // compression (store)
    localHeader.writeUInt16LE(0, 10); // mod time
    localHeader.writeUInt16LE(0, 12); // mod date
    localHeader.writeUInt32LE(crc32(fileData), 14); // crc32
    localHeader.writeUInt32LE(fileData.length, 18); // compressed size
    localHeader.writeUInt32LE(fileData.length, 22); // uncompressed size
    localHeader.writeUInt16LE(fileName.length, 26); // filename length
    localHeader.writeUInt16LE(0, 28); // extra field length

    const localHeaderEntry = Buffer.concat([localHeader, fileName, fileData]);
    parts.push(localHeaderEntry);

    // Central directory entry
    const centralEntry = Buffer.alloc(46);
    centralEntry.writeUInt32LE(0x02014b50, 0); // signature
    centralEntry.writeUInt16LE(20, 4); // version made by
    centralEntry.writeUInt16LE(20, 6); // version needed
    centralEntry.writeUInt16LE(0, 8); // flags
    centralEntry.writeUInt16LE(0, 10); // compression
    centralEntry.writeUInt16LE(0, 12); // mod time
    centralEntry.writeUInt16LE(0, 14); // mod date
    centralEntry.writeUInt32LE(crc32(fileData), 16); // crc32
    centralEntry.writeUInt32LE(fileData.length, 20); // compressed size
    centralEntry.writeUInt32LE(fileData.length, 24); // uncompressed size
    centralEntry.writeUInt16LE(fileName.length, 28); // filename length
    centralEntry.writeUInt16LE(0, 30); // extra field length
    centralEntry.writeUInt16LE(0, 32); // comment length
    centralEntry.writeUInt16LE(0, 34); // disk number start
    centralEntry.writeUInt16LE(0, 36); // internal file attributes
    centralEntry.writeUInt32LE(0, 38); // external file attributes
    centralEntry.writeUInt32LE(offset, 42); // relative offset

    const centralDirEntry = Buffer.concat([centralEntry, fileName]);
    centralDirectory.push(centralDirEntry);

    offset += localHeaderEntry.length;
  }

  const centralDirOffset = offset;
  const centralDirBuffer = Buffer.concat(centralDirectory);
  const centralDirSize = centralDirBuffer.length;

  // End of central directory
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0); // signature
  endRecord.writeUInt16LE(0, 4); // disk number
  endRecord.writeUInt16LE(0, 6); // central dir disk
  endRecord.writeUInt16LE(entries.length, 8); // entries on disk
  endRecord.writeUInt16LE(entries.length, 10); // total entries
  endRecord.writeUInt32LE(centralDirSize, 12); // central dir size
  endRecord.writeUInt32LE(centralDirOffset, 16); // central dir offset
  endRecord.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...parts, centralDirBuffer, endRecord]);
}

// CRC32 implementation
function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  const table = new Uint32Array(256);

  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[i] = c;
  }

  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}