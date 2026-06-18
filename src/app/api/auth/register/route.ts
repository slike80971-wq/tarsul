import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth-helper'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Security: Only authenticated admins can create accounts
    const session = await getAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if the requester is an admin
    const admin = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (admin?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'تم تعطيل التسجيل الذاتي. يرجى التواصل مع المسؤول لإنشاء حساب.' },
        { status: 403 }
      )
    }

    // Redirect to admin creation endpoint
    return NextResponse.json(
      { error: 'استخدم لوحة تحكم المسؤول لإنشاء حسابات جديدة.', redirectTo: '/admin' },
      { status: 403 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'خطأ في الخادم' },
      { status: 500 }
    )
  }
}
