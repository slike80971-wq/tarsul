/**
 * Auth helper for protecting API routes.
 */
import { NextRequest } from 'next/server';
import { getSession } from '@/lib/sessions';
import { db } from '@/lib/db';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string | null;
  status: string;
  publicKey: string | null;
}

export async function authenticate(
  request: NextRequest
): Promise<{ user: AuthUser; error: null } | { user: null; error: { message: string; status: number } }> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return { user: null, error: { message: 'غير مصرح', status: 401 } };
  }

  const session = await getSession(token);
  if (!session) {
    return { user: null, error: { message: 'جلسة منتهية الصلاحية', status: 401 } };
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true, email: true, name: true, role: true,
      department: true, status: true, publicKey: true,
    },
  });

  if (!user) {
    return { user: null, error: { message: 'المستخدم غير موجود', status: 404 } };
  }

  return { user, error: null };
}