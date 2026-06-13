'use client';

import { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function formatCallDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ---------------------------------------------------------------------------
// Inline style injection (run once per mount) for custom @keyframes
// ---------------------------------------------------------------------------

function useInjectCallAnimations() {
  const injected = useRef(false);

  useEffect(() => {
    if (injected.current) return;
    injected.current = true;

    const styleId = 'call-ui-animations';
    if (document.getElementById(styleId)) return;

    const sheet = document.createElement('style');
    sheet.id = styleId;
    sheet.textContent = /* css */ `
      @keyframes pulse-ring {
        0%   { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.6); }
        70%  { box-shadow: 0 0 0 20px rgba(52, 211, 153, 0); }
        100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
      }

      @keyframes slide-down {
        0%   { opacity: 0; transform: translate(-50%, -100%); }
        100% { opacity: 1; transform: translate(-50%, 0); }
      }

      .animate-pulse-ring {
        animation: pulse-ring 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }

      .animate-slide-down {
        animation: slide-down 0.35s ease-out forwards;
      }
    `;
    document.head.appendChild(sheet);
  }, []);
}

// ---------------------------------------------------------------------------
// 1. CallDialog — Outgoing call dialog
// ---------------------------------------------------------------------------

export interface CallDialogProps {
  target: { id: string; name: string; avatar?: string | null } | null;
  callType: 'audio' | 'video' | null;
  onCancel: () => void;
}

export function CallDialog({ target, callType, onCancel }: CallDialogProps) {
  useInjectCallAnimations();

  if (!target || !callType) return null;

  const initials = target.name.charAt(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-8 rounded-3xl border border-white/10 bg-white/5 px-12 py-16 shadow-2xl backdrop-blur-xl">
        {/* Avatar with pulsing ring */}
        <div className="relative flex items-center justify-center">
          {/* Ping ring */}
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/30" />

          {/* Avatar */}
          <div
            className="animate-pulse-ring relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-3xl font-bold text-white shadow-lg"
          >
            {target.avatar ? (
              <img
                src={target.avatar}
                alt={target.name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>
        </div>

        {/* Call-type icon */}
        <div className="animate-pulse text-emerald-400">
          {callType === 'audio' ? (
            <Phone className="h-8 w-8" />
          ) : (
            <Video className="h-8 w-8" />
          )}
        </div>

        {/* Target name */}
        <h2 className="text-2xl font-semibold text-white">{target.name}</h2>

        {/* Status */}
        <p className="flex items-center gap-1 text-sm text-white/70">
          {callType === 'audio' ? 'مكالمة صوتية' : 'مكالمة فيديو'}
          <span className="mx-1">—</span>
          جاري الاتصال
          <Dots />
        </p>

        {/* Cancel button */}
        <Button
          onClick={onCancel}
          className="mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500"
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. IncomingCallDialog — Incoming call notification
// ---------------------------------------------------------------------------

export interface IncomingCallDialogProps {
  caller: {
    callerId: string;
    callerName: string;
    callerAvatar?: string | null;
    callType: 'audio' | 'video';
  } | null;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallDialog({
  caller,
  onAccept,
  onReject,
}: IncomingCallDialogProps) {
  useInjectCallAnimations();

  if (!caller) return null;

  const initials = caller.callerName.charAt(0);

  return (
    <div
      className="animate-slide-down fixed top-4 left-1/2 z-[60] w-auto max-w-sm -translate-x-1/2"
    >
      <div className="flex items-center gap-4 rounded-2xl border border-emerald-500/30 bg-gray-900/90 px-5 py-4 shadow-2xl backdrop-blur-xl">
        {/* Blinking emerald dot */}
        <div className="relative">
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-3 w-3 animate-ping rounded-full bg-emerald-400" />
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-3 w-3 rounded-full bg-emerald-500" />
        </div>

        {/* Avatar */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-lg font-bold text-white">
          {caller.callerAvatar ? (
            <img
              src={caller.callerAvatar}
              alt={caller.callerName}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-semibold text-white">
            {caller.callerName}
          </span>
          <span className="text-xs text-white/60">
            {caller.callType === 'audio' ? 'مكالمة صوتية' : 'مكالمة فيديو'}
          </span>
        </div>

        {/* Actions */}
        <div className="mr-auto flex items-center gap-3">
          <Button
            onClick={onReject}
            size="icon"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500"
            aria-label="رفض المكالمة"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>

          <Button
            onClick={onAccept}
            size="icon"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500"
            aria-label="قبول المكالمة"
          >
            {caller.callType === 'audio' ? (
              <Phone className="h-5 w-5" />
            ) : (
              <Video className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. ActiveCallScreen — Active call interface
// ---------------------------------------------------------------------------

export interface ActiveCallScreenProps {
  target: { id: string; name: string; avatar?: string | null } | null;
  callType: 'audio' | 'video' | null;
  duration: number;
  isMuted: boolean;
  isVideoOff: boolean;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onHangUp: () => void;
}

export function ActiveCallScreen({
  target,
  callType,
  duration,
  isMuted,
  isVideoOff,
  remoteStream,
  localStream,
  onToggleMute,
  onToggleVideo,
  onHangUp,
}: ActiveCallScreenProps) {
  useInjectCallAnimations();

  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Attach streams to video elements once they're available
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  if (!target || !callType) return null;

  const initials = target.name.charAt(0);
  const isVideoCall = callType === 'video';
  const showRemoteVideo = isVideoCall && remoteStream;
  const showLocalPiP = isVideoCall && localStream;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950" dir="rtl">
      {/* Remote video (full screen background for video calls) */}
      {showRemoteVideo && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* Local video (picture-in-picture) */}
      {showLocalPiP && (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="fixed bottom-28 left-4 z-10 h-44 w-32 rounded-xl border-2 border-emerald-400 object-cover shadow-lg"
        />
      )}

      {/* Center content area */}
      {!showRemoteVideo && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          {/* Large avatar */}
          <div className="animate-pulse-ring flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-4xl font-bold text-white shadow-xl">
            {target.avatar ? (
              <img
                src={target.avatar}
                alt={target.name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          {/* Name */}
          <h2 className="text-2xl font-semibold text-white">{target.name}</h2>

          {/* Duration or connecting status */}
          {remoteStream ? (
            <p className="font-mono text-lg text-white/50">
              {formatCallDuration(duration)}
            </p>
          ) : (
            <p className="flex items-center gap-1 text-sm text-white/50">
              جاري الاتصال
              <Dots />
            </p>
          )}
        </div>
      )}

      {/* When remote video is visible, show name + duration overlay on top */}
      {showRemoteVideo && (
        <div className="absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-2 bg-gradient-to-b from-black/60 to-transparent pb-12 pt-8">
          <h2 className="text-xl font-semibold text-white">{target.name}</h2>
          {remoteStream ? (
            <p className="font-mono text-base text-white/70">
              {formatCallDuration(duration)}
            </p>
          ) : (
            <p className="flex items-center gap-1 text-sm text-white/60">
              جاري الاتصال
              <Dots />
            </p>
          )}
        </div>
      )}

      {/* Bottom control bar */}
      <div className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-center gap-6 bg-black/40 px-8 py-6 backdrop-blur-md rounded-t-3xl">
        {/* Toggle Mute */}
        <Button
          onClick={onToggleMute}
          size="icon"
          className={`flex h-14 w-14 items-center justify-center rounded-full text-white focus-visible:ring-offset-0 ${
            isMuted
              ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
              : 'bg-white/10 hover:bg-white/20 focus-visible:ring-white/30'
          }`}
          aria-label={isMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
        >
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>

        {/* Toggle Video (only for video calls) */}
        {isVideoCall && (
          <Button
            onClick={onToggleVideo}
            size="icon"
            className={`flex h-14 w-14 items-center justify-center rounded-full text-white focus-visible:ring-offset-0 ${
              isVideoOff
                ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
                : 'bg-white/10 hover:bg-white/20 focus-visible:ring-white/30'
            }`}
            aria-label={isVideoOff ? 'تشغيل الكاميرا' : 'إيقاف الكاميرا'}
          >
            {isVideoOff ? (
              <VideoOff className="h-6 w-6" />
            ) : (
              <Video className="h-6 w-6" />
            )}
          </Button>
        )}

        {/* Hang Up */}
        <Button
          onClick={onHangUp}
          size="icon"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500"
          aria-label="إنهاء المكالمة"
        >
          <PhoneOff className="h-7 w-7" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared: Animated dots helper
// ---------------------------------------------------------------------------

function Dots() {
  return (
    <span className="inline-flex gap-0.5">
      <span className="animate-bounce [animation-delay:0ms] text-xs">.</span>
      <span className="animate-bounce [animation-delay:150ms] text-xs">.</span>
      <span className="animate-bounce [animation-delay:300ms] text-xs">.</span>
    </span>
  );
}
