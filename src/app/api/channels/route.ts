/**
 * GET /api/channels - List all channels the user is a member of
 * POST /api/channels - Create a new channel
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

    // Get channels where user is a member, with member count and unread counts
    const memberships = await db.channelMember.findMany({
      where: { userId: auth.user!.id },
      include: {
        channel: {
          include: {
            _count: { select: { members: true } },
            members: {
              where: { userId: auth.user!.id },
              select: { lastRead: true },
            },
          },
        },
      },
      orderBy: { channel: { updatedAt: 'desc' } },
    });

    const channels = memberships.map((m) => {
      const { members, ...channelData } = m.channel;
      const memberCount = (channelData as unknown as { _count: { members: number } })._count.members;
      return {
        ...channelData,
        memberCount,
        lastRead: m.lastRead,
        userRole: m.role,
      };
    });

    return NextResponse.json({ channels });
  } catch (error: unknown) {
    console.error('List channels error:', error);
    return NextResponse.json({ error: 'خطأ في جلب القنوات' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const body = await request.json();
    const { name, description, type, icon } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'اسم القناة مطلوب' }, { status: 400 });
    }

    // Create the channel
    const channel = await db.channel.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        type: type || 'channel',
        icon: icon || null,
        createdBy: auth.user!.id,
        members: {
          create: {
            userId: auth.user!.id,
            role: 'admin',
          },
        },
      },
      include: {
        _count: { select: { members: true } },
      },
    });

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create channel error:', error);
    return NextResponse.json({ error: 'خطأ في إنشاء القناة' }, { status: 500 });
  }
}