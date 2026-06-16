/**
 * GET /api/users - List all users (for DM creation, member lists, online panel)
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

    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const excludeSelf = url.searchParams.get('excludeSelf') !== 'false';

    const users = await db.user.findMany({
      where: {
        ...(excludeSelf ? { id: { not: auth.user!.id } } : {}),
        ...(search ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { department: { contains: search } },
          ],
        } : {}),
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
        lastSeen: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    console.error('List users error:', error);
    return NextResponse.json({ error: 'خطأ في جلب المستخدمين' }, { status: 500 });
  }
}