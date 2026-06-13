/**
 * POST /api/auth/register
 * Register a new user with enterprise email.
 * Body: { email, name, password, department? }
 * Returns: { user, token }
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { createSession } from '@/lib/sessions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, password, department } = body;

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني والاسم وكلمة المرور مطلوبة' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'صيغة البريد الإلكتروني غير صالحة' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل' },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'هذا البريد الإلكتروني مسجل مسبقاً' },
        { status: 409 }
      );
    }

    const { hash, salt } = hashPassword(password);
    const passwordHash = `${salt}:${hash}`;

    const user = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        passwordHash,
        department: department || null,
        role: 'member',
        status: 'offline',
      },
    });

    const { token } = await createSession(user.id);

    const { passwordHash: _, ...safeUser } = user;

    return NextResponse.json({
      user: safeUser,
      token,
    });
  } catch (error: unknown) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء التسجيل' },
      { status: 500 }
    );
  }
}