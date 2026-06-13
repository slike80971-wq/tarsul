'use client';

/**
 * Tarsul - تراسل | WebRTC Call Hook
 *
 * Manages audio/video calling with Socket.io signalling.
 * Uses module-level singletons (socket, peer connection, streams) so the hook
 * works correctly across multiple component instances.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth-store';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export type CallState = 'idle' | 'ringing' | 'connecting' | 'active' | 'ended';
export type CallType = 'audio' | 'video';

interface CallTarget {
  id: string;
  name: string;
  avatar?: string | null;
}

export interface IncomingCallInfo {
  callerId: string;
  callerName: string;
  callerAvatar?: string | null;
  callType: CallType;
}

export interface UseCallReturn {
  callState: CallState;
  callType: CallType | null;
  callTarget: CallTarget | null;
  callDuration: number;
  isMuted: boolean;
  isVideoOff: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (target: CallTarget, type: CallType) => void;
  answerCall: () => void;
  rejectCall: () => void;
  hangUp: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  incomingCall: IncomingCallInfo | null;
}

/* -------------------------------------------------------------------------- */
/*  Module-level singletons (persist across renders & component instances)     */
/* -------------------------------------------------------------------------- */

let callSocket: Socket | null = null;
let peerConnection: RTCPeerConnection | null = null;
let localMediaStream: MediaStream | null = null;
let remoteMediaStream: MediaStream | null = null;
let activeCallId: string | null = null;
let storedOffer: RTCSessionDescriptionInit | null = null;
let durationTimer: ReturnType<typeof setInterval> | null = null;
let autoRejectTimer: ReturnType<typeof setTimeout> | null = null;

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/* -------------------------------------------------------------------------- */
/*  Utility helpers                                                            */
/* -------------------------------------------------------------------------- */

const makeCallId = (): string =>
  `call_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

/** Play a simple 440 Hz beep × 3 for incoming-call notification. */
function playRingBeep(): void {
  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, t + i * 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.4 + 0.2);
      osc.start(t + i * 0.4);
      osc.stop(t + i * 0.4 + 0.2);
    }
  } catch {
    /* AudioContext not available — silent fallback */
  }
}

function clearDurationTimer(): void {
  if (durationTimer) {
    clearInterval(durationTimer);
    durationTimer = null;
  }
}

function clearAutoRejectTimer(): void {
  if (autoRejectTimer) {
    clearTimeout(autoRejectTimer);
    autoRejectTimer = null;
  }
}

/** Tear down the current peer connection and local/remote streams. */
function teardownPeer(): void {
  if (peerConnection) {
    peerConnection.ontrack = null;
    peerConnection.onicecandidate = null;
    peerConnection.onconnectionstatechange = null;
    peerConnection.close();
    peerConnection = null;
  }
  if (localMediaStream) {
    localMediaStream.getTracks().forEach((t) => t.stop());
    localMediaStream = null;
  }
  remoteMediaStream = null;
  storedOffer = null;
  activeCallId = null;
}

/* -------------------------------------------------------------------------- */
/*  Hook                                                                       */
/* -------------------------------------------------------------------------- */

export function useCall(): UseCallReturn {
  /* ---- React state ---- */
  const [callState, setCallState] = useState<CallState>('idle');
  const [callType, setCallType] = useState<CallType | null>(null);
  const [callTarget, setCallTarget] = useState<CallTarget | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);

  /* ---- Bridge refs (allow socket handlers to call latest closures) ---- */
  const resetRef = useRef<() => void>(() => {});
  const incomingCallRef = useRef<IncomingCallInfo | null>(null);

  // Keep incomingCallRef in sync
  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  /* ---- resetCallState ---- */
  const resetCallState = useCallback(() => {
    setCallState('idle');
    setCallType(null);
    setCallTarget(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setIncomingCall(null);
    setCallDuration(0);
    setLocalStream(null);
    setRemoteStream(null);
    clearDurationTimer();
    clearAutoRejectTimer();
    teardownPeer();
  }, []);

  // Keep resetRef in sync so socket handlers always invoke the latest version
  useEffect(() => {
    resetRef.current = resetCallState;
  }, [resetCallState]);

  /* ---- Socket singleton ---- */
  const getSocket = useCallback((): Socket => {
    if (callSocket) return callSocket;

    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    callSocket = socket;

    socket.on('connect', () => {
      const user = useAuthStore.getState().user;
      if (user) {
        socket.emit('auth', {
          userId: user.id,
          name: user.name,
          department: user.department,
          publicKey: user.publicKey,
        });
      }
    });

    return socket;
  }, []);

  /* ---- Wire up signalling event handlers (once per mount) ---- */
  useEffect(() => {
    const socket = getSocket();

    /* ---- call-offer (incoming ring) ---- */
    socket.on(
      'call-offer',
      (payload: {
        callId: string;
        from: string;
        fromName: string;
        fromAvatar?: string | null;
        to: string;
        callType: CallType;
        sdp: RTCSessionDescriptionInit;
      }) => {
        activeCallId = payload.callId;
        storedOffer = payload.sdp;

        setIncomingCall({
          callerId: payload.from,
          callerName: payload.fromName,
          callerAvatar: payload.fromAvatar,
          callType: payload.callType,
        });
        setCallState('ringing');
        playRingBeep();

        // Auto-reject after 30 seconds
        clearAutoRejectTimer();
        autoRejectTimer = setTimeout(() => {
          if (callSocket) {
            callSocket.emit('call-reject', {
              callId: payload.callId,
              from: useAuthStore.getState().user?.id,
            });
          }
          resetRef.current();
        }, 30_000);
      },
    );

    /* ---- call-answer (caller receives this) ---- */
    socket.on(
      'call-answer',
      async (payload: {
        callId: string;
        from: string;
        sdp: RTCSessionDescriptionInit;
      }) => {
        if (!peerConnection || payload.callId !== activeCallId) return;
        try {
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(payload.sdp),
          );
        } catch (err) {
          console.error('[useCall] setRemoteDescription (answer):', err);
        }
      },
    );

    /* ---- call-ice-candidate ---- */
    socket.on(
      'call-ice-candidate',
      async (payload: {
        callId: string;
        from: string;
        candidate: RTCIceCandidateInit;
      }) => {
        if (!peerConnection || payload.callId !== activeCallId) return;
        try {
          await peerConnection.addIceCandidate(
            new RTCIceCandidate(payload.candidate),
          );
        } catch (err) {
          console.error('[useCall] addIceCandidate:', err);
        }
      },
    );

    /* ---- call-reject ---- */
    socket.on(
      'call-reject',
      (payload: { callId: string; from: string }) => {
        if (payload.callId !== activeCallId) return;
        setCallState('ended');
        resetRef.current();
      },
    );

    /* ---- call-hangup ---- */
    socket.on(
      'call-hangup',
      (payload: { callId: string; from: string }) => {
        if (payload.callId !== activeCallId) return;
        setCallState('ended');
        resetRef.current();
      },
    );

    return () => {
      socket.off('call-offer');
      socket.off('call-answer');
      socket.off('call-ice-candidate');
      socket.off('call-reject');
      socket.off('call-hangup');
    };
  }, [getSocket]);

  /* ---- Helper: attach peer-connection lifecycle events ---- */
  const attachPeerEvents = useCallback(
    (pc: RTCPeerConnection, socket: Socket, callId: string) => {
      // Prepare remote stream placeholder
      remoteMediaStream = new MediaStream();
      setRemoteStream(new MediaStream());

      pc.ontrack = (event) => {
        if (!remoteMediaStream) remoteMediaStream = new MediaStream();
        event.streams[0].getTracks().forEach((t) => remoteMediaStream!.addTrack(t));
        setRemoteStream(new MediaStream(remoteMediaStream!.getTracks()));
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('call-ice-candidate', {
            callId,
            from: useAuthStore.getState().user?.id,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.onconnectionstatechange = () => {
        switch (pc.connectionState) {
          case 'connected': {
            setCallState('active');
            clearDurationTimer();
            setCallDuration(0);
            durationTimer = setInterval(
              () => setCallDuration((d) => d + 1),
              1000,
            );
            break;
          }
          case 'disconnected':
          case 'failed': {
            setCallState('ended');
            resetRef.current();
            break;
          }
        }
      };
    },
    [],
  );

  /* ========================================================================= */
  /*  Public actions                                                           */
  /* ========================================================================= */

  /** Initiate an outgoing call to `target`. */
  const startCall = useCallback(
    async (target: CallTarget, type: CallType) => {
      try {
        const socket = getSocket();
        const callId = makeCallId();
        activeCallId = callId;

        setCallState('connecting');
        setCallType(type);
        setCallTarget(target);
        setIsMuted(false);
        setIsVideoOff(type === 'audio');

        // 1. Acquire local media
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === 'video',
        });
        localMediaStream = stream;
        setLocalStream(stream);

        // 2. Create RTCPeerConnection
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnection = pc;

        // Add local tracks
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        // 3. Attach WebRTC events
        attachPeerEvents(pc, socket, callId);

        // 4. Create offer & set local description
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // 5. Emit call-offer through signalling
        const user = useAuthStore.getState().user;
        socket.emit('call-offer', {
          callId,
          from: user?.id,
          fromName: user?.name,
          fromAvatar: user?.avatar,
          to: target.id,
          callType: type,
          sdp: pc.localDescription,
        });
      } catch (err) {
        console.error('[useCall] startCall error:', err);
        setCallState('idle');
        teardownPeer();
        setLocalStream(null);
        setRemoteStream(null);
      }
    },
    [getSocket, attachPeerEvents],
  );

  /** Accept an incoming call (stored in `incomingCall` / module-level `storedOffer`). */
  const answerCall = useCallback(async () => {
    clearAutoRejectTimer();
    if (!callSocket || !storedOffer) return;

    const ic = incomingCallRef.current;
    if (!ic) return;

    try {
      const socket = callSocket;
      const callId = activeCallId!;
      const type = ic.callType;

      setCallState('connecting');
      setCallType(type);
      setCallTarget({
        id: ic.callerId,
        name: ic.callerName,
        avatar: ic.callerAvatar,
      });
      setIsMuted(false);
      setIsVideoOff(type === 'audio');
      setIncomingCall(null);

      // 1. Acquire local media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
      localMediaStream = stream;
      setLocalStream(stream);

      // 2. Create RTCPeerConnection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnection = pc;

      // Add local tracks
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // 3. Attach WebRTC events
      attachPeerEvents(pc, socket, callId);

      // 4. Set remote description (the offer we received)
      await pc.setRemoteDescription(new RTCSessionDescription(storedOffer));
      storedOffer = null;

      // 5. Create answer & set local description
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // 6. Emit call-answer through signalling
      socket.emit('call-answer', {
        callId,
        from: useAuthStore.getState().user?.id,
        sdp: pc.localDescription,
      });
    } catch (err) {
      console.error('[useCall] answerCall error:', err);
      setCallState('idle');
      teardownPeer();
      setLocalStream(null);
      setRemoteStream(null);
    }
  }, [attachPeerEvents]);

  /** Reject an incoming call. */
  const rejectCall = useCallback(() => {
    clearAutoRejectTimer();
    if (callSocket && activeCallId) {
      callSocket.emit('call-reject', {
        callId: activeCallId,
        from: useAuthStore.getState().user?.id,
      });
    }
    resetRef.current();
  }, []);

  /** Hang up the current call (outgoing or active). */
  const hangUp = useCallback(() => {
    if (callSocket && activeCallId) {
      callSocket.emit('call-hangup', {
        callId: activeCallId,
        from: useAuthStore.getState().user?.id,
      });
    }
    setCallState('ended');
    resetRef.current();
  }, []);

  /** Toggle microphone on/off. */
  const toggleMute = useCallback(() => {
    if (!localMediaStream) return;
    localMediaStream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((prev) => !prev);
  }, []);

  /** Toggle camera on/off (video calls only). */
  const toggleVideo = useCallback(() => {
    if (!localMediaStream) return;
    localMediaStream.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsVideoOff((prev) => !prev);
  }, []);

  /* ---- Cleanup on unmount ---- */
  useEffect(() => {
    return () => {
      clearDurationTimer();
      clearAutoRejectTimer();
      teardownPeer();
      // Socket stays alive (singleton) — handlers are removed by the other
      // useEffect cleanup above.  If no component is using the hook the socket
      // will be garbage-collected once `callSocket` is nulled.
    };
  }, []);

  /* ---- Return value ---- */
  return {
    callState,
    callType,
    callTarget,
    callDuration,
    isMuted,
    isVideoOff,
    localStream,
    remoteStream,
    startCall,
    answerCall,
    rejectCall,
    hangUp,
    toggleMute,
    toggleVideo,
    incomingCall,
  };
}
