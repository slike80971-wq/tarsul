import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/channels - Get all channels
export async function GET() {
  try {
    const channels = await db.channel.findMany({
      include: {
        members: {
          include: { user: { select: { id: true, name: true, avatar: true, status: true } } },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, name: true, avatar: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ channels });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب القنوات' }, { status: 500 });
  }
}

// POST /api/channels - Create a new channel (admin only)
export async function POST(req: NextRequest) {
  try {
    const { name, description, createdBy, memberIds, isLocked } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'اسم القناة مطلوب' }, { status: 400 });
    }

    if (!createdBy) {
      return NextResponse.json({ error: 'فقط المسؤول يمكنه إنشاء القنوات' }, { status: 403 });
    }

    const channel = await db.channel.create({
      data: {
        name,
        description,
        createdBy,
        isLocked: isLocked || false,
        members: {
          create: [
            ...(memberIds || []).map((id: string) => ({ userId: id, role: 'عضو' })),
            { userId: createdBy, role: 'مسؤول' },
          ],
        },
      },
      include: { members: { include: { user: true } } },
    });

    return NextResponse.json({ channel });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ أثناء إنشاء القناة' }, { status: 500 });
  }
}
