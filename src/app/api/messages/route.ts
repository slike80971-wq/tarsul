import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/messages?conversationId=xxx - Get messages for a conversation
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json({ error: 'معرف المحادثة مطلوب' }, { status: 400 });
    }

    const messages = await db.message.findMany({
      where: { conversationId },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب الرسائل' }, { status: 500 });
  }
}

// POST /api/messages - Send a new message (with optional file)
export async function POST(req: NextRequest) {
  try {
    const { conversationId, senderId, content, type, fileName, fileUrl, fileSize } = await req.json();

    if (!conversationId || !senderId) {
      return NextResponse.json({ error: 'بيانات الرسالة غير مكتملة' }, { status: 400 });
    }

    const message = await db.message.create({
      data: {
        conversationId,
        senderId,
        content: content || '',
        type: type || 'نص',
        fileName: fileName || null,
        fileUrl: fileUrl || null,
        fileSize: fileSize || null,
      },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
    });

    // Update conversation timestamp
    await db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ message });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ أثناء إرسال الرسالة' }, { status: 500 });
  }
}
