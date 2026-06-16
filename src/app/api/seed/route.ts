/**
 * POST /api/seed
 * Seed the database with demo data (admin user + default channels).
 * Only runs if no users exist yet.
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { createSession } from '@/lib/sessions';

export async function POST() {
  try {
    // Check if already seeded
    const existingUsers = await db.user.count();
    if (existingUsers > 0) {
      return NextResponse.json({ message: 'Database already seeded' });
    }

    // Create admin user
    const { hash, salt } = hashPassword('Admin@123');
    const admin = await db.user.create({
      data: {
        email: 'admin@tarsul.ly',
        name: 'مدير النظام',
        passwordHash: `${salt}:${hash}`,
        role: 'admin',
        department: 'تقنية المعلومات',
        status: 'online',
      },
    });

    // Create demo users
    const demoUsers = [
      { email: 'ahmed@bank.ly', name: 'أحمد محمد', department: 'الإدارة', role: 'manager' as const },
      { email: 'sara@bank.ly', name: 'سارة علي', department: 'الموارد البشرية', role: 'member' as const },
      { email: 'omar@bank.ly', name: 'عمر حسين', department: 'تقنية المعلومات', role: 'member' as const },
      { email: 'fatima@bank.ly', name: 'فاطمة خالد', department: 'المحاسبة', role: 'member' as const },
      { email: 'youssef@bank.ly', name: 'يوسف إبراهيم', department: 'الأمن السيبراني', role: 'member' as const },
    ];

    const createdUsers = [];
    for (const u of demoUsers) {
      const { hash: h, salt: s } = hashPassword('User@123');
      const user = await db.user.create({
        data: {
          email: u.email,
          name: u.name,
          passwordHash: `${s}:${h}`,
          role: u.role,
          department: u.department,
          status: 'offline',
        },
      });
      createdUsers.push(user);
    }

    // Create default channels
    const channels = [
      { name: 'عام', description: 'قناة عامة لجميع الموظفين', type: 'channel', icon: '💬' },
      { name: 'الإعلانات', description: 'إعلانات وإشعارات رسمية', type: 'department', icon: '📢' },
      { name: 'تقنية المعلومات', description: 'دعم فني ومشاريع تقنية', type: 'department', icon: '🖥️' },
      { name: 'الموارد البشرية', description: 'شؤون الموظفين والإجازات', type: 'department', icon: '👥' },
      { name: 'الأمن السيبراني', description: 'تنبيهات أمنية وتقارير', type: 'department', icon: '🔒' },
    ];

    const allUsers = [admin, ...createdUsers];

    for (const ch of channels) {
      const channel = await db.channel.create({
        data: {
          name: ch.name,
          description: ch.description,
          type: ch.type,
          icon: ch.icon,
          createdBy: admin.id,
        },
      });

      // Add admin to ALL channels, other users to general/announcements + their department
      const membersToAdd = ch.name === 'عام' || ch.name === 'الإعلانات'
        ? allUsers
        : [admin, ...allUsers.filter(u => u.department === ch.name)];

      for (const user of membersToAdd) {
        await db.channelMember.create({
          data: {
            channelId: channel.id,
            userId: user.id,
            role: user.id === admin.id ? 'admin' : 'member',
          },
        });
      }

      // Add some system messages
      await db.message.create({
        data: {
          content: `تم إنشاء قناة "${ch.name}"`,
          senderId: admin.id,
          channelId: channel.id,
          type: 'system',
        },
      });
    }

    // Create admin session
    const { token } = await createSession(admin.id);

    const { passwordHash: _, ...safeAdmin } = admin;

    return NextResponse.json({
      message: 'Database seeded successfully',
      admin: { ...safeAdmin, status: 'online' },
      token,
      demoCredentials: {
        admin: { email: 'admin@tarsul.ly', password: 'Admin@123' },
        users: demoUsers.map(u => ({ email: u.email, password: 'User@123' })),
      },
    });
  } catch (error: unknown) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'خطأ في تهيئة قاعدة البيانات' }, { status: 500 });
  }
}