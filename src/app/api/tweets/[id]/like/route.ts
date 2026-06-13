/**
 * POST /api/tweets/[id]/like - Toggle like on a tweet
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth-middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const { id } = await params;
    const userId = auth.user!.id;

    // Check if tweet exists
    const tweet = await db.tweet.findUnique({ where: { id } });
    if (!tweet || tweet.isDeleted) {
      return NextResponse.json({ error: 'التغريدة غير موجودة' }, { status: 404 });
    }

    // Check if already liked
    const existing = await db.tweetLike.findUnique({
      where: { tweetId_userId: { tweetId: id, userId } },
    });

    if (existing) {
      // Unlike
      await db.tweetLike.delete({ where: { id: existing.id } });
      await db.tweet.update({
        where: { id },
        data: { likes: { decrement: 1 } },
      });
      return NextResponse.json({ liked: false, likes: Math.max(0, tweet.likes - 1) });
    } else {
      // Like
      await db.tweetLike.create({
        data: { tweetId: id, userId },
      });
      await db.tweet.update({
        where: { id },
        data: { likes: { increment: 1 } },
      });
      return NextResponse.json({ liked: true, likes: tweet.likes + 1 });
    }
  } catch (error: unknown) {
    console.error('Like tweet error:', error);
    return NextResponse.json({ error: 'خطأ في تحديث الإعجاب' }, { status: 500 });
  }
}