import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/conversations - Get all conversations for a user
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    const conversations = await db.conversation.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        members: {
          include: { user: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب المحادثات' }, { status: 500 });
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(req: NextRequest) {
  try {
    const { name, type, memberIds } = await req.json();
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    const conversation = await db.conversation.create({
      data: {
        name: name || null,
        type: type || 'خاص',
        members: {
          create: [
            { userId },
            ...(memberIds || []).map((id: string) => ({ userId: id })),
          ],
        },
      },
      include: { members: { include: { user: true } } },
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ أثناء إنشاء المحادثة' }, { status: 500 });
  }
}
