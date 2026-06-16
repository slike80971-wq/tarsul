/**
 * POST /api/auth/login
 * Authenticate user with email and password.
 * Body: { email, password }
 * Returns: { user, token }
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { createSession } from '@/lib/sessions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني وكلمة المرور مطلوبان' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    const [salt, storedHash] = user.passwordHash.split(':');
    const isValid = verifyPassword(password, storedHash, salt);

    if (!isValid) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    await db.user.update({
      where: { id: user.id },
      data: { status: 'online', lastSeen: new Date() },
    });

    const { token } = await createSession(user.id);

    const { passwordHash: _, ...safeUser } = user;

    return NextResponse.json({
      user: { ...safeUser, status: 'online' },
      token,
    });
  } catch (error: unknown) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تسجيل الدخول' },
      { status: 500 }
    );
  }
}