/**
 * GET /api/tweets - List all tweets (feed)
 * POST /api/tweets - Create a new tweet
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '30');
    const before = url.searchParams.get('before');

    const where: Record<string, unknown> = { isDeleted: false };
    if (before) {
      (where as { createdAt: { lt: Date } }).createdAt = { lt: new Date(before) };
    }

    const tweets = await db.tweet.findMany({
      where,
      include: {
        sender: {
          select: { id: true, name: true, avatar: true, role: true, department: true },
        },
        _count: {
          select: { TweetLike: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Check which tweets the current user has liked
    const tweetIds = tweets.map((t) => t.id);
    const userLikes = await db.tweetLike.findMany({
      where: { userId: auth.user!.id, tweetId: { in: tweetIds } },
      select: { tweetId: true },
    });
    const likedIds = new Set(userLikes.map((l) => l.tweetId));

    const enriched = tweets.map((t) => ({
      id: t.id,
      content: t.content,
      likes: t.likes,
      retweets: t.retweets,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      sender: t.sender,
      likeCount: t._count.TweetLike,
      isLiked: likedIds.has(t.id),
    }));

    return NextResponse.json({ tweets: enriched });
  } catch (error: unknown) {
    console.error('List tweets error:', error);
    return NextResponse.json({ error: 'خطأ في جلب التغريدات' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'محتوى التغريدة مطلوب' }, { status: 400 });
    }

    if (content.length > 500) {
      return NextResponse.json({ error: 'التغريدة لا يمكن أن تتجاوز 500 حرف' }, { status: 400 });
    }

    const tweet = await db.tweet.create({
      data: {
        content: content.trim(),
        senderId: auth.user!.id,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true, role: true, department: true },
        },
        _count: {
          select: { TweetLike: true },
        },
      },
    });

    return NextResponse.json({
      tweet: {
        ...tweet,
        likeCount: 0,
        isLiked: false,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create tweet error:', error);
    return NextResponse.json({ error: 'خطأ في إنشاء التغريدة' }, { status: 500 });
  }
}