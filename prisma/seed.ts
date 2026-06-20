import { db } from '@/lib/db';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create admin first
  const admin = await db.user.create({
    data: { email: 'admin@example.com', password: 'admin123', name: 'المسؤول', status: 'متصل', role: 'مسؤول', approvalStatus: 'approved' },
  });

  // Create approved users
  const user1 = await db.user.create({
    data: { email: 'ahmed@example.com', password: '123456', name: 'أحمد محمد', status: 'متصل', role: 'مستخدم', approvalStatus: 'approved' },
  });
  const user2 = await db.user.create({
    data: { email: 'fatima@example.com', password: '123456', name: 'فاطمة علي', status: 'متاح', role: 'مستخدم', approvalStatus: 'approved' },
  });
  const user3 = await db.user.create({
    data: { email: 'mohammed@example.com', password: '123456', name: 'محمد سعيد', status: 'متصل', role: 'مستخدم', approvalStatus: 'approved' },
  });
  const user4 = await db.user.create({
    data: { email: 'sara@example.com', password: '123456', name: 'سارة خالد', status: 'غير متصل', role: 'مستخدم', approvalStatus: 'approved' },
  });
  const user5 = await db.user.create({
    data: { email: 'bashir@example.com', password: '123456', name: 'بشير علي محمد سعيد', status: 'متصل', role: 'مستخدم', approvalStatus: 'approved' },
  });

  // Create pending users (waiting for admin approval)
  const pending1 = await db.user.create({
    data: { email: 'khalid@example.com', password: '123456', name: 'خالد عبدالله', status: 'غير متصل', role: 'مستخدم', approvalStatus: 'pending' },
  });
  const pending2 = await db.user.create({
    data: { email: 'nora@example.com', password: '123456', name: 'نورة سالم', status: 'غير متصل', role: 'مستخدم', approvalStatus: 'pending' },
  });

  // Create blocked user
  const blocked1 = await db.user.create({
    data: { email: 'spam@example.com', password: '123456', name: 'حساب محظور', status: 'غير متصل', role: 'مستخدم', approvalStatus: 'approved', isBlocked: true },
  });

  // Create conversations
  const conv1 = await db.conversation.create({
    data: {
      name: 'محادثة خاصة',
      type: 'خاص',
      status: 'مفتوحة',
      isFavorite: true,
      createdBy: admin.id,
      members: { create: [{ userId: user1.id }, { userId: user2.id }] },
    },
  });

  const conv2 = await db.conversation.create({
    data: {
      name: 'مجموعة العمل',
      type: 'مجموعة',
      status: 'مفتوحة',
      isFavorite: false,
      createdBy: admin.id,
      members: { create: [{ userId: user1.id }, { userId: user3.id }, { userId: user4.id }] },
    },
  });

  const conv3 = await db.conversation.create({
    data: {
      name: 'محادثة جديدة',
      type: 'خاص',
      status: 'مفتوحة',
      isFavorite: false,
      createdBy: user5.id,
      members: { create: [{ userId: user1.id }, { userId: user5.id }] },
    },
  });

  const conv4 = await db.conversation.create({
    data: {
      name: 'مشروع التصميم',
      type: 'مجموعة',
      status: 'مكتملة',
      isFavorite: true,
      createdBy: admin.id,
      members: { create: [{ userId: user2.id }, { userId: user3.id }] },
    },
  });

  const conv5 = await db.conversation.create({
    data: {
      name: 'الدعم الفني',
      type: 'مجموعة',
      status: 'مفتوحة',
      isFavorite: false,
      createdBy: admin.id,
      members: { create: [{ userId: user1.id }, { userId: admin.id }] },
    },
  });

  const conv6 = await db.conversation.create({
    data: {
      name: 'محادثة مغلقة',
      type: 'خاص',
      status: 'مغلقة',
      isFavorite: false,
      createdBy: admin.id,
      members: { create: [{ userId: user3.id }, { userId: user4.id }] },
    },
  });

  // Messages
  await db.message.createMany({
    data: [
      { conversationId: conv1.id, senderId: user2.id, content: 'مرحبا، كيف حالك؟' },
      { conversationId: conv1.id, senderId: user1.id, content: 'أهلاً فاطمة، الحمد لله بخير' },
      { conversationId: conv1.id, senderId: user2.id, content: 'هل أنهيت الملف المطلوب؟' },
      { conversationId: conv1.id, senderId: user1.id, content: 'نعم، سأرسله لك الآن' },
      { conversationId: conv1.id, senderId: user2.id, content: 'شكراً لك، بانتظاره' },
    ],
  });

  await db.message.createMany({
    data: [
      { conversationId: conv2.id, senderId: user3.id, content: 'مرحبا بالجميع، اجتماع الساعة 10 صباحاً' },
      { conversationId: conv2.id, senderId: user1.id, content: 'ممتاز، سأكون حاضر' },
      { conversationId: conv2.id, senderId: user4.id, content: 'أنا أيضاً سأحضر' },
      { conversationId: conv2.id, senderId: user3.id, content: 'حسناً، لا تنسوا إحضار التقرير' },
    ],
  });

  await db.message.createMany({
    data: [
      { conversationId: conv3.id, senderId: user5.id, content: 'السلام عليكم' },
      { conversationId: conv3.id, senderId: user1.id, content: 'وعليكم السلام، كيف حالك يا بشير؟' },
      { conversationId: conv3.id, senderId: user5.id, content: 'بخير الحمد لله، أردت الاستفسار عن المشروع' },
    ],
  });

  await db.message.createMany({
    data: [
      { conversationId: conv5.id, senderId: user1.id, content: 'مرحبا، كيف يمكنني مساعدتك اليوم؟' },
      { conversationId: conv5.id, senderId: admin.id, content: 'أنا بحاجة إلى معلومات عن الخدمات المتاحة' },
      { conversationId: conv5.id, senderId: user1.id, content: 'بالتأكيد، يمكنني مساعدتك في ذلك' },
      { conversationId: conv5.id, senderId: admin.id, content: 'شكراً لك على سرعة الرد' },
    ],
  });

  // Create channels (only admin can create)
  const ch1 = await db.channel.create({
    data: {
      name: 'القناة العامة',
      description: 'قناة للتواصل العام',
      createdBy: admin.id,
      members: { create: [{ userId: user1.id }, { userId: user2.id }, { userId: user3.id }] },
    },
  });

  const ch2 = await db.channel.create({
    data: {
      name: 'قناة الأعضاء',
      description: 'قناة خاصة بالأعضاء',
      createdBy: admin.id,
      members: { create: [{ userId: user1.id }, { userId: user3.id }, { userId: user5.id }, { userId: admin.id }] },
    },
  });

  const ch3 = await db.channel.create({
    data: {
      name: 'قناة المسؤولين',
      description: 'قناة الإدارة',
      createdBy: admin.id,
      isLocked: true,
      members: { create: [{ userId: admin.id, role: 'مسؤول' }] },
    },
  });

  const ch4 = await db.channel.create({
    data: {
      name: 'قناة الدعم',
      description: 'قناة الدعم الفني',
      createdBy: admin.id,
      members: { create: [{ userId: user1.id }, { userId: user2.id }, { userId: user4.id }, { userId: user5.id }] },
    },
  });

  const ch5 = await db.channel.create({
    data: {
      name: 'قناة المبيعات',
      description: 'قناة متابعة المبيعات',
      createdBy: admin.id,
      members: { create: [{ userId: user3.id }, { userId: user4.id }] },
    },
  });

  const ch6 = await db.channel.create({
    data: {
      name: 'قناة المطورين',
      description: 'قناة فريق التطوير',
      createdBy: admin.id,
      members: { create: [{ userId: user1.id }, { userId: user3.id }, { userId: user5.id }] },
    },
  });

  // Channel messages
  await db.channelMessage.createMany({
    data: [
      { channelId: ch1.id, senderId: user1.id, content: 'مرحباً بالجميع في القناة العامة' },
      { channelId: ch1.id, senderId: user3.id, content: 'أهلاً وسهلاً، نورت القناة' },
      { channelId: ch1.id, senderId: user2.id, content: 'جديد: تمت إضافة عضو جديد إلى القناة' },
      { channelId: ch2.id, senderId: admin.id, content: 'مرحباً بكم في قناة الأعضاء' },
      { channelId: ch3.id, senderId: admin.id, content: 'اجتماع الإدارة يوم الأحد القادم' },
      { channelId: ch4.id, senderId: user4.id, content: 'تم حل المشكلة التقنية' },
      { channelId: ch5.id, senderId: user3.id, content: 'تقرير المبيعات الشهري جاهز' },
    ],
  });

  console.log('✅ Database seeded successfully!');
  console.log(`Created 9 users (5 approved, 2 pending, 1 blocked, 1 admin), 6 conversations, 6 channels`);
}

seed().catch(console.error);
