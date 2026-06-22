import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB max

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'لم يتم إرسال ملف' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'حجم الملف يتجاوز الحد المسموح (50 ميجابايت)' }, { status: 400 });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name) || '';
    const uniqueName = `${randomUUID()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);

    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${uniqueName}`;

    return NextResponse.json({
      url: fileUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء رفع الملف' }, { status: 500 });
  }
}
