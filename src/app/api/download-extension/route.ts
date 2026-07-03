import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET() {
  try {
    const zipPath = path.join(
      process.cwd(),
      "public",
      "download",
      "amazon-jobs-monitor.zip"
    );

    const zipBuffer = await fs.readFile(zipPath);

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition":
          'attachment; filename="amazon-jobs-monitor.zip"',
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error serving extension zip:", error);
    return NextResponse.json(
      { error: "Failed to download extension" },
      { status: 500 }
    );
  }
}