import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/channels/[id]/messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const messages = await db.channelMessage.findMany({
      where: { channelId: id },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب الرسائل' }, { status: 500 });
  }
}

// POST /api/channels/[id]/messages - Send message to channel (with optional file)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { senderId, content, type, fileName, fileUrl, fileSize } = await req.json();

    if (!senderId) {
      return NextResponse.json({ error: 'بيانات الرسالة غير مكتملة' }, { status: 400 });
    }

    const message = await db.channelMessage.create({
      data: {
        channelId: id,
        senderId,
        content: content || '',
        type: type || 'نص',
        fileName: fileName || null,
        fileUrl: fileUrl || null,
        fileSize: fileSize || null,
      },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
    });

    // Update channel timestamp
    await db.channel.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ message });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ أثناء إرسال الرسالة' }, { status: 500 });
  }
}
