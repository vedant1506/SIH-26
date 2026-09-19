import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * Route handler for /documents/:filename
 * 
 * Ensures robust serving of project PDF citations:
 * 1. If requested PDF exists in public/documents/, serves it directly with Content-Type application/pdf
 * 2. If requested PDF does not exist, automatically falls back to /documents/mospi_flash_report.pdf
 *    guaranteeing that missing PDFs NEVER crash the application or return broken 404s.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;
    const decodedFilename = decodeURIComponent(filename || "");

    const publicDocsDir = path.join(process.cwd(), "public", "documents");
    const requestedFilePath = path.join(publicDocsDir, decodedFilename);
    const fallbackFilePath = path.join(publicDocsDir, "mospi_flash_report.pdf");

    // 1. If requested file exists on disk, stream it
    if (fs.existsSync(requestedFilePath) && fs.statSync(requestedFilePath).isFile()) {
      const fileBuffer = fs.readFileSync(requestedFilePath);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${decodedFilename}"`,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // 2. Fallback to mospi_flash_report.pdf if file does not exist
    if (fs.existsSync(fallbackFilePath)) {
      const fallbackBuffer = fs.readFileSync(fallbackFilePath);
      return new NextResponse(fallbackBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="mospi_flash_report.pdf"`,
          "X-Fallback-Document-Applied": "true",
          "X-Requested-Document": decodedFilename,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // 3. Fallback redirect if local files are served from static CDN
    return NextResponse.redirect(new URL("/documents/mospi_flash_report.pdf", request.url), 307);
  } catch (error) {
    console.error("Error serving document citation:", error);
    // Never crash the application on document error
    return NextResponse.redirect(new URL("/documents/mospi_flash_report.pdf", request.url), 307);
  }
}
