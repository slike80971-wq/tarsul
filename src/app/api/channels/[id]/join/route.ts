/**
 * POST /api/channels/[id]/join - Join a channel
 * DELETE /api/channels/[id]/join - Leave a channel
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth-middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const { id } = await params;

    const channel = await db.channel.findUnique({ where: { id } });
    if (!channel) {
      return NextResponse.json({ error: 'القناة غير موجودة' }, { status: 404 });
    }

    const membership = await db.channelMember.create({
      data: { channelId: id, userId: auth.user!.id },
      include: { channel: true },
    });

    return NextResponse.json({ membership }, { status: 201 });
  } catch (error: unknown) {
    console.error('Join channel error:', error);
    if (String(error).includes('Unique')) {
      return NextResponse.json({ error: 'أنت عضو بالفعل' }, { status: 409 });
    }
    return NextResponse.json({ error: 'خطأ في الانضمام' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const { id } = await params;

    await db.channelMember.delete({
      where: { channelId_userId: { channelId: id, userId: auth.user!.id } },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Leave channel error:', error);
    return NextResponse.json({ error: 'خطأ في مغادرة القناة' }, { status: 500 });
  }
}