import { db } from '@/lib/db';
import { ChatAppClient } from './chat-app-client';

async function getInitialData() {
  try {
    const users = await db.user.findMany({
      select: { id: true, email: true, name: true, avatar: true, status: true, role: true, timezone: true, approvalStatus: true, isBlocked: true },
    });

    const conversations = await db.conversation.findMany({
      include: {
        members: { include: { user: { select: { id: true, name: true, avatar: true, status: true, role: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: { select: { id: true, name: true, avatar: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const channels = await db.channel.findMany({
      include: {
        members: { include: { user: { select: { id: true, name: true, avatar: true, status: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: { select: { id: true, name: true, avatar: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const allMessages = await db.message.findMany({
      include: { sender: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const allChannelMessages = await db.channelMessage.findMany({
      include: { sender: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return { users, conversations, channels, allMessages, allChannelMessages };
  } catch {
    return { users: [], conversations: [], channels: [], allMessages: [], allChannelMessages: [] };
  }
}

export default async function ChatApp() {
  const initialData = await getInitialData();

  return <ChatAppClient initialData={JSON.parse(JSON.stringify(initialData))} />;
}
