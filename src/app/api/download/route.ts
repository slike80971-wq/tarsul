/**
 * GET /api/download?file=uploads/filename.ext&name=original-name.ext
 * Serves uploaded files with Content-Disposition: attachment to force download.
 * No auth required — files in public/uploads/ are already statically served.
 * Security: path traversal prevention + extension whitelist.
 */
import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// Security: only allow specific file extensions
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx'];

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export async function GET(request: NextRequest) {
  try {
    const fileParam = request.nextUrl.searchParams.get('file');
    const nameParam = request.nextUrl.searchParams.get('name');

    if (!fileParam) {
      return NextResponse.json({ error: 'معامل الملف مطلوب' }, { status: 400 });
    }

    // Security: normalize path — strip leading slash, prevent traversal
    const normalized = fileParam.replace(/^\/+/, '').replace(/\.\./g, '');

    // Must start with uploads/ — file should be in the uploads directory
    if (!normalized.startsWith('uploads/')) {
      return NextResponse.json({ error: 'مسار الملف غير صالح' }, { status: 400 });
    }

    // Extract just the filename (after uploads/) for safety
    const filename = normalized.replace(/^.*[\/\\]/, '').replace(/\.\./g, '');

    if (!filename) {
      return NextResponse.json({ error: 'اسم الملف غير صالح' }, { status: 400 });
    }

    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: 'نوع الملف غير مسموح به' }, { status: 400 });
    }

    const filePath = path.join(UPLOADS_DIR, filename);

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'الملف غير موجود' }, { status: 404 });
    }

    const fileStat = await stat(filePath);
    const fileBuffer = await readFile(filePath);
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    // Use the original name for download, fallback to stored filename
    const downloadName = nameParam
      ? nameParam.replace(/[^\w\.\-\u0600-\u06FF]/g, '_')
      : filename;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
        'Content-Length': fileStat.size.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: unknown) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تنزيل الملف' },
      { status: 500 }
    );
  }
}