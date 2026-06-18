import { NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth-helper'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getAuthSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        conversations: {
          include: {
            conversation: {
              include: {
                participants: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                        about: true,
                        isOnline: true,
                        lastSeen: true,
                      },
                    },
                  },
                },
                messages: {
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                  include: {
                    sender: {
                      select: {
                        id: true,
                        name: true,
                        avatar: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { joinedAt: 'desc' },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const conversations = user.conversations.map((cp) => {
      const { conversation } = cp
      const lastMessage = conversation.messages[0] || null

      return {
        id: conversation.id,
        type: conversation.type,
        name: conversation.name,
        avatar: conversation.avatar,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        participants: conversation.participants.map((p) => ({
          id: p.id,
          conversationId: p.conversationId,
          userId: p.userId,
          role: p.role,
          joinedAt: p.joinedAt,
          user: p.user,
        })),
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.content,
              type: lastMessage.type,
              mediaUrl: lastMessage.mediaUrl,
              mediaName: lastMessage.mediaName,
              isRead: lastMessage.isRead,
              createdAt: lastMessage.createdAt,
              sender: lastMessage.sender,
            }
          : null,
      }
    })

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      about: user.about,
      role: user.role,
      isActive: user.isActive,
      isVerified: user.isVerified,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
      conversations,
    })
  } catch (error) {
    console.error('Fetch user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
