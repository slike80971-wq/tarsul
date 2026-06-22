import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/channels/[id]/members - Get channel members
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const members = await db.channelMember.findMany({
      where: { channelId: id },
      include: { user: { select: { id: true, name: true, avatar: true, status: true, email: true, role: true } } },
      orderBy: { joinedAt: 'asc' },
    });
    return NextResponse.json({ members });
  } catch {
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب الأعضاء' }, { status: 500 });
  }
}

// POST /api/channels/[id]/members - Add member to channel (admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, addedBy } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    // Check if user is already a member
    const existing = await db.channelMember.findUnique({
      where: { channelId_userId: { channelId: id, userId } },
    });

    if (existing) {
      return NextResponse.json({ error: 'المستخدم عضو بالفعل في هذه القناة' }, { status: 400 });
    }

    const member = await db.channelMember.create({
      data: {
        channelId: id,
        userId,
        role: 'عضو',
      },
      include: { user: { select: { id: true, name: true, avatar: true, status: true } } },
    });

    // Update channel timestamp
    await db.channel.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ member });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ أثناء إضافة العضو' }, { status: 500 });
  }
}

// DELETE /api/channels/[id]/members?userId=xxx - Remove member from channel (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    await db.channelMember.delete({
      where: { channelId_userId: { channelId: id, userId } },
    });

    // Update channel timestamp
    await db.channel.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ أثناء إزالة العضو' }, { status: 500 });
  }
}
