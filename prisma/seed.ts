import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

async function seed() {
  console.log('🌱 Seeding database...');

  const adminPassword = await bcrypt.hash('admin123', 12);
  const userPassword = await bcrypt.hash('123456', 12);

  const admin = await db.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      name: 'المسؤول',
      status: 'متصل',
      role: 'مسؤول',
      approvalStatus: 'approved',
    },
  });

  const user1 = await db.user.upsert({
    where: { email: 'ahmed@example.com' },
    update: {},
    create: {
      email: 'ahmed@example.com',
      password: userPassword,
      name: 'أحمد محمد',
      status: 'متصل',
      role: 'مستخدم',
      approvalStatus: 'approved',
    },
  });

  const user2 = await db.user.upsert({
    where: { email: 'fatima@example.com' },
    update: {},
    create: {
      email: 'fatima@example.com',
      password: userPassword,
      name: 'فاطمة علي',
      status: 'متاح',
      role: 'مستخدم',
      approvalStatus: 'approved',
    },
  });

  const conv1 = await db.conversation.create({
    data: {
      name: 'محادثة خاصة',
      type: 'خاص',
      status: 'مفتوحة',
      isFavorite: true,
      createdById: admin.id,
      members: {
        create: [{ userId: user1.id }, { userId: user2.id }],
      },
    },
  });

  await db.message.create({
    data: {
      conversationId: conv1.id,
      senderId: user1.id,
      content: 'مرحباً بك في النظام',
    },
  });

  console.log('✅ Database seeded successfully!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
