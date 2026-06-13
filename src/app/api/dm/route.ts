/**
 * GET /api/dm - List all direct message conversations for the current user
 * POST /api/dm - Create or get a DM conversation with another user
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    // Find all DMs where the user is either user1 or user2
    const dms = await db.directMessage.findMany({
      where: {
        OR: [
          { user1Id: auth.user!.id },
          { user2Id: auth.user!.id },
        ],
      },
      include: {
        user1: { select: { id: true, name: true, avatar: true, status: true, department: true } },
        user2: { select: { id: true, name: true, avatar: true, status: true, department: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Format the response to show the "other user"
    const conversations = dms.map((dm) => {
      const otherUser = dm.user1Id === auth.user!.id ? dm.user2 : dm.user1;
      return {
        id: dm.id,
        otherUser,
        lastMessageAt: dm.lastMessageAt,
        messageCount: (dm as unknown as { _count: { messages: number } })._count.messages,
      };
    });

    return NextResponse.json({ conversations });
  } catch (error: unknown) {
    console.error('List DMs error:', error);
    return NextResponse.json({ error: 'خطأ في جلب المحادثات' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const { recipientId } = await request.json();

    if (!recipientId || recipientId === auth.user!.id) {
      return NextResponse.json({ error: 'معرف المستلم غير صالح' }, { status: 400 });
    }

    // Check if recipient exists
    const recipient = await db.user.findUnique({ where: { id: recipientId } });
    if (!recipient) {
      return NextResponse.json({ error: 'المستلم غير موجود' }, { status: 404 });
    }

    // Find existing DM or create new one (always use smaller ID as user1Id)
    const ids = [auth.user!.id, recipientId].sort();
    const dm = await db.directMessage.upsert({
      where: { user1Id_user2Id: { user1Id: ids[0], user2Id: ids[1] } },
      create: { user1Id: ids[0], user2Id: ids[1] },
      update: {},
      include: {
        user1: { select: { id: true, name: true, avatar: true, status: true } },
        user2: { select: { id: true, name: true, avatar: true, status: true } },
      },
    });

    const otherUser = dm.user1Id === auth.user!.id ? dm.user2 : dm.user1;

    return NextResponse.json({ conversation: { id: dm.id, otherUser } }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create DM error:', error);
    return NextResponse.json({ error: 'خطأ في إنشاء المحادثة' }, { status: 500 });
  }
}