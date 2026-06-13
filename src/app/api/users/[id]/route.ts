/**
 * GET /api/users/[id] - Get a single user by ID
 * PATCH /api/users/[id] - Update user's public key / profile
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        department: true,
        status: true,
        publicKey: true,
        lastSeen: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: unknown) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'خطأ في جلب بيانات المستخدم' }, { status: 500 });
  }
}

// Update user profile / public key
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const { id } = await params;
    if (id !== auth.user!.id) {
      return NextResponse.json({ error: 'غير مصرح بتعديل بيانات مستخدم آخر' }, { status: 403 });
    }

    const body = await request.json();
    const { publicKey, name, avatar, status } = body;

    const user = await db.user.update({
      where: { id },
      data: {
        ...(publicKey ? { publicKey } : {}),
        ...(name ? { name } : {}),
        ...(avatar !== undefined ? { avatar } : {}),
        ...(status ? { status } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        department: true,
        status: true,
        publicKey: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error: unknown) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'خطأ في تحديث البيانات' }, { status: 500 });
  }
}