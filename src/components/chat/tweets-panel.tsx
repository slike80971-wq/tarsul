/**
 * Tarsul - تراسل | Tweets Panel (تغريدات)
 * Corporate micro-blogging feed integrated into the chat platform.
 */
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  X, Heart, Repeat2, Trash2, Send, Loader2, MessageCircle, Feather,
  TrendingUp, Clock,
} from 'lucide-react';

// ========================
// Types
// ========================
interface TweetSender {
  id: string;
  name: string;
  avatar?: string | null;
  role: string;
  department?: string | null;
}

interface Tweet {
  id: string;
  content: string;
  likes: number;
  retweets: number;
  createdAt: string;
  updatedAt: string;
  sender: TweetSender;
  likeCount: number;
  isLiked: boolean;
}

// ========================
// Utility
// ========================
function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHr < 24) return `منذ ${diffHr} ساعة`;
  if (diffDay < 7) return `منذ ${diffDay} يوم`;
  return date.toLocaleDateString('ar-LY', { month: 'short', day: 'numeric' });
}

function getInitials(name: string): string {
  if (!name) return '?';
  return name.charAt(0);
}

function TweetAvatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-12 h-12 text-lg' : size === 'md' ? 'w-9 h-9 text-sm' : 'w-8 h-8 text-xs';
  const colors = [
    'from-emerald-400 to-teal-500', 'from-amber-400 to-orange-500',
    'from-rose-400 to-pink-500', 'from-violet-400 to-purple-500',
    'from-cyan-400 to-blue-500', 'from-lime-400 to-green-500',
  ];
  const colorIdx = name.charCodeAt(0) % colors.length;
  return (
    <Avatar className={sizeClass}>
      <AvatarFallback className={`${colors[colorIdx]} text-white font-medium`}>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

// ========================
// Single Tweet Card
// ========================
function TweetCard({
  tweet,
  currentUserId,
  onDelete,
  onLike,
}: {
  tweet: Tweet;
  currentUserId: string;
  onDelete: (id: string) => void;
  onLike: (id: string) => void;
}) {
  const isOwn = tweet.sender.id === currentUserId;
  const [localLiked, setLocalLiked] = useState(tweet.isLiked);
  const [localLikes, setLocalLikes] = useState(tweet.likeCount);
  const [likeLoading, setLikeLoading] = useState(false);

  const handleLike = async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    // Optimistic update
    setLocalLiked(!localLiked);
    setLocalLikes(localLiked ? localLikes - 1 : localLikes + 1);
    try {
      await onLike(tweet.id);
    } catch {
      // Revert on error
      setLocalLiked(localLiked);
      setLocalLikes(localLikes);
    } finally {
      setLikeLoading(false);
    }
  };

  const roleLabel = tweet.sender.role === 'admin' ? 'مدير' : tweet.sender.role === 'manager' ? 'مشرف' : 'عضو';

  return (
    <div className="p-4 border-b border-border hover:bg-muted/30 transition-colors group" dir="rtl">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0 mt-0.5">
          <TweetAvatar name={tweet.sender.name} size="md" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-foreground">{tweet.sender.name}</span>
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{roleLabel}</Badge>
            {tweet.sender.department && (
              <span className="text-[10px] text-muted-foreground hidden sm:inline">{tweet.sender.department}</span>
            )}
            <span className="text-[10px] text-muted-foreground mr-auto flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {timeAgo(tweet.createdAt)}
            </span>
          </div>

          {/* Tweet Text */}
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words mb-3">
            {tweet.content}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-6 -mr-2">
            {/* Like */}
            <button
              onClick={handleLike}
              disabled={likeLoading}
              className={`flex items-center gap-1.5 text-xs transition-colors group/btn ${
                localLiked
                  ? 'text-rose-500 hover:text-rose-600'
                  : 'text-muted-foreground hover:text-rose-500'
              }`}
            >
              <Heart className={`w-4 h-4 ${localLiked ? 'fill-current' : ''} transition-all ${likeLoading ? 'opacity-50' : ''}`} />
              {likeLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <span>{localLikes > 0 ? localLikes : ''}</span>
              )}
            </button>

            {/* Retweet */}
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-emerald-500 transition-colors group/btn">
              <Repeat2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
              {tweet.retweets > 0 && <span>{tweet.retweets}</span>}
            </button>

            {/* Delete (own tweets) */}
            {isOwn && (
              <button
                onClick={() => onDelete(tweet.id)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================
// Compose Tweet
// ========================
function ComposeTweet({
  onPost,
  maxLength = 500,
}: {
  onPost: (content: string) => Promise<void>;
  maxLength?: number;
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const charCount = text.length;
  const isOverLimit = charCount > maxLength;
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!text.trim() || loading || isOverLimit) return;
    setLoading(true);
    try {
      await onPost(text.trim());
      setText('');
      inputRef.current?.focus();
    } catch {
      toast.error('فشل في نشر التغريدة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border-b border-border" dir="rtl">
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
            <Feather className="w-4 h-4 text-white" />
          </div>
        </div>
        <div className="flex-1">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
            placeholder="ما الذي يدور في ذهنك؟"
            className="w-full resize-none border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[60px] max-h-[120px]"
            rows={2}
            maxLength={maxLength + 50}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              {charCount > maxLength * 0.8 && (
                <span className={`text-[10px] ${isOverLimit ? 'text-red-500 font-medium' : 'text-amber-500'}`}>
                  {charCount}/{maxLength}
                </span>
              )}
              {charCount === 0 && (
                <span className="text-[10px] text-muted-foreground">
                  Ctrl+Enter للنشر
                </span>
              )}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!text.trim() || loading || isOverLimit}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-4 text-xs rounded-full disabled:opacity-40"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 ml-1" />}
              تغريد
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================
// Main Tweets Panel
// ========================
export function TweetsPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, token } = useAuthStore();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  const loadTweets = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/tweets', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.tweets) setTweets(data.tweets);
    } catch (err) {
      console.error('Load tweets error:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (open) loadTweets();
  }, [open, loadTweets]);

  const handlePost = async (content: string) => {
    if (!token) return;
    setPosting(true);
    try {
      const res = await fetch('/api/tweets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.tweet) {
        setTweets((prev) => [data.tweet, ...prev]);
        toast.success('تم نشر التغريدة');
      }
    } catch {
      toast.error('فشل في نشر التغريدة');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (tweetId: string) => {
    if (!token) return;
    const res = await fetch(`/api/tweets/${tweetId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.liked !== undefined) {
      setTweets((prev) =>
        prev.map((t) =>
          t.id === tweetId
            ? { ...t, isLiked: data.liked, likeCount: data.likes, likes: data.likes }
            : t
        )
      );
    }
  };

  const handleDelete = async (tweetId: string) => {
    if (!token) return;
    try {
      await fetch(`/api/tweets/${tweetId}/delete`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setTweets((prev) => prev.filter((t) => t.id !== tweetId));
      toast.success('تم حذف التغريدة');
    } catch {
      toast.error('فشل في حذف التغريدة');
    }
  };

  if (!open) return null;

  return (
    <div className="w-80 lg:w-96 border-l flex flex-col h-full bg-card animate-slide-in-right" dir="rtl">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-[var(--tarsul-header-bg)]">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-sky-400 to-blue-500 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          تغريدات المؤسسة
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Compose */}
      <ComposeTweet onPost={handlePost} />

      {/* Feed */}
      <ScrollArea className="flex-1 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
          </div>
        ) : tweets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground px-6" dir="rtl">
            <MessageCircle className="w-10 h-10 mb-3 text-sky-300 dark:text-sky-700" />
            <p className="text-sm font-medium">لا توجد تغريدات بعد</p>
            <p className="text-xs mt-1 text-center">كن أول من ينشر تغريدة في المؤسسة!</p>
          </div>
        ) : (
          tweets.map((tweet) => (
            <TweetCard
              key={tweet.id}
              tweet={tweet}
              currentUserId={user?.id || ''}
              onDelete={handleDelete}
              onLike={handleLike}
            />
          ))
        )}
      </ScrollArea>

      {/* Footer stats */}
      <div className="p-3 border-t bg-muted/30">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Feather className="w-3 h-3" />
            {tweets.length} تغريدة
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {tweets.reduce((sum, t) => sum + t.likeCount, 0)} إعجاب
          </span>
        </div>
      </div>
    </div>
  );
}