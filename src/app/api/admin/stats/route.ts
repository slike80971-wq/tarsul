import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET /api/admin/stats - Get comprehensive statistics
export async function GET() {
  try {
    const [
      totalUsers,
      activeUsers,
      blockedUsers,
      pendingApprovals,
      totalConversations,
      openConversations,
      closedConversations,
      groupConversations,
      totalChannels,
      totalMessages,
      totalChannelMessages,
      recentMessages,
      voiceCallsCount,
      usersByRole,
      conversationsByStatus,
      channelsByLock,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { status: 'متصل', isBlocked: false, approvalStatus: 'approved' } }),
      db.user.count({ where: { isBlocked: true } }),
      db.user.count({ where: { approvalStatus: 'pending' } }),
      db.conversation.count(),
      db.conversation.count({ where: { status: 'مفتوحة' } }),
      db.conversation.count({ where: { status: 'مغلقة' } }),
      db.conversation.count({ where: { type: 'مجموعة' } }),
      db.channel.count(),
      db.message.count(),
      db.channelMessage.count(),
      db.message.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      db.voiceCall.count(),
      db.user.groupBy({ by: ['role'], _count: { id: true } }),
      db.conversation.groupBy({ by: ['status'], _count: { id: true } }),
      db.channel.groupBy({ by: ['isLocked'], _count: { id: true } }),
    ]);

    // Messages per day (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const messagesPerDay = await db.$queryRaw<
      { date: string; count: number }[]
    >`
      SELECT DATE(createdAt) as date, COUNT(*) as count
      FROM Message
      WHERE createdAt >= ${sevenDaysAgo}
      GROUP BY DATE(createdAt)
      ORDER BY date ASC
    `.then(rows => (rows || []).map(r => ({ date: String(r.date), count: Number(r.count) })));

    // Most active users
    const messagesByUser = await db.message.groupBy({
      by: ['senderId'],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const userIds = messagesByUser.map(m => m.senderId);
    const topUsersData = userIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        })
      : [];

    const topUsers = messagesByUser.map(m => {
      const user = topUsersData.find(u => u.id === m.senderId);
      return { name: user?.name || 'مجهول', messages: Number(m._count.id) };
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        blockedUsers,
        pendingApprovals,
        totalConversations,
        openConversations,
        closedConversations,
        groupConversations,
        totalChannels,
        totalMessages: totalMessages + totalChannelMessages,
        totalDirectMessages: totalMessages,
        totalChannelMessages,
        recentMessages,
        voiceCalls: voiceCallsCount,
        usersByRole: usersByRole.map(r => ({ role: r.role, count: Number(r._count.id) })),
        conversationsByStatus: conversationsByStatus.map(c => ({ status: c.status, count: Number(c._count.id) })),
        channelsByLock: channelsByLock.map(c => ({ locked: c.isLocked, count: Number(c._count.id) })),
        messagesPerDay,
        topUsers,
      },
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب الإحصائيات' }, { status: 500 });
  }
}
