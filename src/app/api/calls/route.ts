import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/calls - Initiate a voice call
export async function POST(req: NextRequest) {
  try {
    const { callerId, receiverId, conversationId, channelId } = await req.json();

    if (!callerId || !receiverId) {
      return NextResponse.json({ error: 'بيانات المكالمة غير مكتملة' }, { status: 400 });
    }

    const call = await db.voiceCall.create({
      data: {
        callerId,
        receiverId,
        conversationId,
        channelId,
        status: 'ringing',
      },
      include: {
        caller: { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } },
      },
    });

    return NextResponse.json({ call });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ أثناء بدء المكالمة' }, { status: 500 });
  }
}

// PATCH /api/calls - Update call status
export async function PATCH(req: NextRequest) {
  try {
    const { callId, status, duration } = await req.json();

    if (!callId || !status) {
      return NextResponse.json({ error: 'بيانات المكالمة غير مكتملة' }, { status: 400 });
    }

    const call = await db.voiceCall.update({
      where: { id: callId },
      data: {
        status,
        duration: duration || 0,
        endedAt: status === 'ended' || status === 'missed' || status === 'rejected' ? new Date() : null,
      },
    });

    return NextResponse.json({ call });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ أثناء تحديث المكالمة' }, { status: 500 });
  }
}
