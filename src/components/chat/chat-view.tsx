'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, ArrowRight, Phone, Search, Settings, PhoneOff, Mic, MicOff, Paperclip, Download, File, ImageIcon, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getSocket } from '@/lib/socket';
import { useAppState, setState, formatTime, formatDuration, type User, type Message, type Conversation } from '@/components/chat';

export { type User, type Message, type Conversation };

export function useCallTimer() {
  const callStatus = useAppState(s => s.callStatus);
  const callTimer = useAppState(s => s.callTimer);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (callStatus === 'connected') {
      intervalRef.current = setInterval(() => {
        const current = useAppState.getState().callTimer;
        setState({ callTimer: current + 1 });
      }, 1000);
    } else if (callStatus === 'ringing') {
      const timeout = setTimeout(() => {
        setState({ callStatus: 'connected', callTimer: 0 });
      }, 3000);
      return () => clearTimeout(timeout);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [callStatus]);

  return callTimer;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function isImageFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().split('.').pop();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext || '');
}

function getFileIconName(fileName: string): 'image' | 'audio' | 'file' {
  const ext = fileName.toLowerCase().split('.').pop();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext || '')) return 'image';
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext || '')) return 'audio';
  return 'file';
}

function FileIcon({ type, className }: { type: 'image' | 'audio' | 'file'; className?: string }) {
  if (type === 'image') return <ImageIcon className={className} />;
  if (type === 'audio') return <Mic className={className} />;
  return <File className={className} />;
}

function FileMessage({ msg, isMine }: { msg: Message; isMine: boolean }) {
  const iconType = getFileIconName(msg.fileName || '');
  const isImage = isImageFile(msg.fileName || '');

  return (
    <div className={`rounded-xl overflow-hidden ${isMine ? 'bg-[#1E3A8A]' : 'bg-gray-100'}`}>
      {msg.content && msg.type === 'ملف' && (
        <div className={`px-3.5 pt-2.5 text-sm ${isMine ? 'text-white' : 'text-gray-800'}`}>
          {msg.content}
        </div>
      )}
      <div className={`px-3.5 ${msg.content && msg.type === 'ملف' ? 'pt-1' : 'py-2.5'} pb-2.5`}>
        {isImage && msg.fileUrl ? (
          <div className="mb-2">
            <img
              src={msg.fileUrl}
              alt={msg.fileName || ''}
              className="max-w-full max-h-48 rounded-lg object-cover"
              loading="lazy"
            />
          </div>
        ) : null}
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            isMine ? 'bg-white/15' : 'bg-gray-200'
          }`}>
            <FileIcon type={iconType} className={`w-4 h-4 ${isMine ? 'text-white' : 'text-gray-500'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium truncate ${isMine ? 'text-white' : 'text-gray-700'}`}>
              {msg.fileName || 'ملف'}
            </p>
            <p className={`text-[10px] ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
              {msg.fileSize ? formatFileSize(msg.fileSize) : ''}
            </p>
          </div>
          {msg.fileUrl && (
            <a
              href={msg.fileUrl}
              download={msg.fileName || undefined}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                isMine
                  ? 'bg-white/15 hover:bg-white/25 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
              }`}
              title="تنزيل الملف"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatView() {
  const currentUser = useAppState(s => s.currentUser);
  const activeConversation = useAppState(s => s.activeConversation);
  const allMessages = useAppState(s => s.allMessages);
  const activeCall = useAppState(s => s.activeCall);
  const callStatus = useAppState(s => s.callStatus);
  const callTimer = useAppState(s => s.callTimer);
  const callMuted = useAppState(s => s.callMuted);

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messages = useAppState(s => s.messages);

  useEffect(() => {
    if (activeConversation) {
      const preLoaded = allMessages?.filter(
        (m: Message) => m.conversationId === activeConversation.id
      ) || [];
      if (preLoaded.length > 0) {
        setState({ messages: preLoaded });
        setLocalMessages(preLoaded);
      } else {
        setState({ messages: [] });
        setLocalMessages([]);
      }
      fetch(`/api/messages?conversationId=${activeConversation.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.messages && data.messages.length > 0) {
            setState({ messages: data.messages });
            setLocalMessages(data.messages);
          }
        })
        .catch(() => {});
    }
  }, [activeConversation?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const uploadFile = async (file: File): Promise<{ url: string; fileName: string; fileSize: number } | null> => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        return { url: data.url, fileName: data.fileName, fileSize: data.fileSize };
      }
      return null;
    } catch {
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if (!currentUser || !activeConversation || sending) return;
    if (!inputText.trim() && !selectedFile) return;

    setSending(true);
    try {
      let fileData: { url: string; fileName: string; fileSize: number } | null = null;
      let messageType = inputText.trim() ? 'نص' : 'ملف';

      if (selectedFile) {
        fileData = await uploadFile(selectedFile);
        if (!fileData) {
          setSending(false);
          return;
        }
        messageType = isImageFile(selectedFile.name) ? 'صورة' : 'ملف';
      }

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConversation.id,
          senderId: currentUser.id,
          content: inputText.trim(),
          type: messageType,
          fileName: fileData?.fileName || null,
          fileUrl: fileData?.url || null,
          fileSize: fileData?.fileSize || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        const newMessages = [...messages, data.message];
        setState({ messages: newMessages });
        setLocalMessages(newMessages);
        setInputText('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        const sock = getSocket();
        if (sock) {
          sock.emit('send-message', { conversationId: activeConversation.id, message: data.message });
        }
      }
    } catch { } finally { setSending(false); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        alert('حجم الملف يتجاوز 50 ميجابايت');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleVoiceCall = async () => {
    if (!currentUser || !activeConversation) return;
    const otherMember = activeConversation.members.find(m => m.user.id !== currentUser?.id);
    if (!otherMember) return;
    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerId: currentUser.id,
          receiverId: otherMember.user.id,
          conversationId: activeConversation.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.call) {
        setState({ activeCall: data.call, callStatus: 'ringing', callTimer: 0 });
      }
    } catch {}
  };

  const endCall = async () => {
    if (!activeCall) return;
    try {
      await fetch('/api/calls', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: activeCall.id, status: 'ended', duration: callTimer }),
      });
    } catch {}
    setState({ activeCall: null, callStatus: 'idle', callTimer: 0, callMuted: false });
  };

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50">
        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4">
          <Send className="w-8 h-8 text-[#1E3A8A]" />
        </div>
        <h3 className="text-lg font-bold text-gray-700 mb-1" dir="rtl">اختر محادثة للبدء</h3>
        <p className="text-sm text-gray-400" dir="rtl">اختر محادثة من القائمة أو أنشئ محادثة جديدة</p>
      </div>
    );
  }

  const otherMember = activeConversation.members.find(m => m.user.id !== currentUser?.id);
  const contactUser = otherMember?.user || activeConversation.members[0]?.user;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white relative">
      {callStatus !== 'idle' && activeCall && (
        <div className="absolute inset-0 z-50 bg-gradient-to-b from-[#1E3A8A] to-[#0f2461] flex flex-col items-center justify-center">
          <div className="text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mx-auto animate-pulse">
              <span className="text-4xl font-bold text-white">{contactUser?.name?.charAt(0) || '?'}</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{contactUser?.name}</h2>
              <p className="text-white/60 mt-1">
                {callStatus === 'ringing' ? 'جاري الاتصال...' :
                 callStatus === 'connected' ? `مكالمة صوتية ${formatDuration(callTimer)}` :
                 'انتهت المكالمة'}
              </p>
            </div>
            <div className="flex items-center gap-6 justify-center">
              {callStatus === 'connected' && (
                <button
                  onClick={() => setState({ callMuted: !callMuted })}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                    callMuted ? 'bg-white/20 text-white' : 'bg-white text-[#1E3A8A]'
                  }`}
                >
                  {callMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
              )}
              <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg shadow-red-500/30">
                <PhoneOff className="w-7 h-7 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3" dir="rtl">
          <button onClick={() => setState({ activeConversation: null })} className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors lg:hidden">
            <ArrowRight className="w-4 h-4 text-gray-600" />
          </button>
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
              {contactUser?.name?.charAt(0) || '?'}
            </div>
            <div className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-white ${
              contactUser?.status === 'متصل' ? 'bg-emerald-500' :
              contactUser?.status === 'متاح' ? 'bg-amber-500' : 'bg-red-500'
            }`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">{activeConversation.name || contactUser?.name}</h3>
            <p className="text-xs text-gray-400">{contactUser?.status === 'متصل' ? 'متصل الآن' : contactUser?.status || 'غير متصل'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={handleVoiceCall} disabled={callStatus !== 'idle'} className="w-8 h-8 rounded-lg hover:bg-emerald-50 flex items-center justify-center transition-colors disabled:opacity-50" title="مكالمة صوتية">
            <Phone className="w-4 h-4 text-emerald-600" />
          </button>
          <button onClick={() => contactUser && setState({ selectedParticipant: contactUser, showParticipantSettings: true })} className="w-8 h-8 rounded-lg hover:bg-gray-50 flex items-center justify-center transition-colors">
            <Settings className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {localMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400" dir="rtl">لا توجد رسائل بعد. ابدأ المحادثة!</p>
          </div>
        ) : (
          localMessages.map((msg) => {
            const isMine = msg.senderId === currentUser?.id;
            const isFileMsg = msg.type === 'ملف' || msg.type === 'صورة' || msg.type === 'صوت' || msg.fileUrl;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`} dir="rtl">
                {!isMine && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-300 to-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {msg.sender?.name?.charAt(0) || '?'}
                  </div>
                )}
                <div className="max-w-[75%]">
                  {!isMine && <p className="text-[10px] text-gray-400 mb-0.5 px-1">{msg.sender?.name}</p>}
                  {isFileMsg ? (
                    <FileMessage msg={msg} isMine={isMine} />
                  ) : (
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMine ? 'bg-[#1E3A8A] text-white rounded-br-md' : 'bg-gray-100 text-gray-800 rounded-bl-md'
                    }`}>
                      {msg.content}
                    </div>
                  )}
                  <p className={`text-[10px] text-gray-400 mt-0.5 px-1 ${isMine ? 'text-left' : 'text-right'}`}>
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Selected file preview */}
      {selectedFile && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center gap-3 shrink-0" dir="rtl">
          <div className="w-10 h-10 rounded-lg bg-[#1E3A8A]/10 flex items-center justify-center shrink-0">
            <File className="w-5 h-5 text-[#1E3A8A]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700 truncate">{selectedFile.name}</p>
            <p className="text-[10px] text-gray-400">{formatFileSize(selectedFile.size)}</p>
          </div>
          <button onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="w-7 h-7 rounded-lg hover:bg-gray-200 flex items-center justify-center">
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
      )}

      <div className="px-4 py-3 border-t border-gray-100 shrink-0">
        <div className="flex items-center gap-2" dir="rtl">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-11 h-11 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors disabled:opacity-50 shrink-0"
            title="إرفاق ملف"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
            ) : (
              <Paperclip className="w-4 h-4 text-gray-500" />
            )}
          </button>
          <Input
            placeholder="اكتب رسالتك..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            className="flex-1 h-11 bg-gray-50 border-gray-200 rounded-xl text-sm"
            dir="rtl"
          />
          <Button onClick={handleSend} disabled={(!inputText.trim() && !selectedFile) || sending || uploading} className="h-11 w-11 p-0 rounded-xl bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 shrink-0">
            {sending || uploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white rotate-180" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
