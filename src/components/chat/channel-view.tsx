'use client';

import { useState, useEffect, useRef } from 'react';
import { Hash, Send, Plus, Phone, Users, PhoneOff, Mic, MicOff, Paperclip, Download, File, ImageIcon, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppState, setState, formatDuration, type Channel, type ChannelMessage } from '@/components/chat';
import { getSocket } from '@/lib/socket';

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
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

function ChannelFileIcon({ type, className }: { type: 'image' | 'audio' | 'file'; className?: string }) {
  if (type === 'image') return <ImageIcon className={className} />;
  if (type === 'audio') return <Mic className={className} />;
  return <File className={className} />;
}

function ChannelFileMessage({ msg, isMine }: { msg: ChannelMessage; isMine: boolean }) {
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
            <ChannelFileIcon type={iconType} className={`w-4 h-4 ${isMine ? 'text-white' : 'text-gray-500'}`} />
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

export function ChannelView() {
  const channels = useAppState(s => s.channels);
  const activeChannel = useAppState(s => s.activeChannel);
  const currentUser = useAppState(s => s.currentUser);
  const allChannelMessages = useAppState(s => s.allChannelMessages);
  const callStatus = useAppState(s => s.callStatus);
  const callTimer = useAppState(s => s.callTimer);
  const callMuted = useAppState(s => s.callMuted);
  const activeCall = useAppState(s => s.activeCall);

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [channelMessages, setChannelMessages] = useState<ChannelMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter channels: only show channels where current user is a member
  const myChannels = channels.filter(ch =>
    ch.members.some(m => m.user.id === currentUser?.id)
  );

  useEffect(() => {
    if (activeChannel) {
      const preLoaded = allChannelMessages?.filter((m: ChannelMessage) => m.channelId === activeChannel.id) || [];
      if (preLoaded.length > 0) {
        setChannelMessages(preLoaded);
      } else {
        setChannelMessages([]);
      }
      fetch(`/api/channels/${activeChannel.id}/messages`)
        .then(res => res.json())
        .then(data => {
          if (data.messages && data.messages.length > 0) {
            setChannelMessages(data.messages);
          }
        })
        .catch(() => {});
    }
  }, [activeChannel?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [channelMessages.length]);

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
    if (!currentUser || !activeChannel || sending) return;
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

      const res = await fetch(`/api/channels/${activeChannel.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        setChannelMessages(prev => [...prev, data.message]);
        setInputText('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        const sock = getSocket();
        if (sock) {
          sock.emit('channel-message', { channelId: activeChannel.id, message: data.message });
        }
      }
    } catch {} finally { setSending(false); }
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
    if (!currentUser || !activeChannel) return;
    const otherMember = activeChannel.members.find(m => m.user.id !== currentUser?.id);
    if (!otherMember) return;
    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callerId: currentUser.id, receiverId: otherMember.user.id, channelId: activeChannel.id }),
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

  return (
    <div className="flex-1 flex min-w-0 relative">
      {callStatus !== 'idle' && activeCall && (
        <div className="absolute inset-0 z-50 bg-gradient-to-b from-[#1E3A8A] to-[#0f2461] flex flex-col items-center justify-center">
          <div className="text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mx-auto animate-pulse">
              <Hash className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{activeChannel?.name || 'مكالمة صوتية'}</h2>
              <p className="text-white/60 mt-1">
                {callStatus === 'ringing' ? 'جاري الاتصال...' :
                 callStatus === 'connected' ? `مكالمة صوتية ${formatDuration(callTimer)}` : 'انتهت المكالمة'}
              </p>
            </div>
            <div className="flex items-center gap-6 justify-center">
              {callStatus === 'connected' && (
                <button onClick={() => setState({ callMuted: !callMuted })} className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${callMuted ? 'bg-white/20 text-white' : 'bg-white text-[#1E3A8A]'}`}>
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

      <div className="w-56 bg-[#1E3A8A] flex flex-col shrink-0 hidden md:flex">
        <div className="px-3 pt-4 pb-2">
          <h2 className="text-white font-bold text-sm mb-3" dir="rtl">قنواتي</h2>
          {currentUser?.role === 'مسؤول' && (
            <Button className="w-full h-8 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg" dir="rtl">
              <Plus className="w-3.5 h-3.5 ml-1" />إنشاء قناة
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {myChannels.map((ch) => (
            <button key={ch.id} onClick={() => setState({ activeChannel: ch, channelMessages: [] })} className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all rounded-lg mb-1 ${activeChannel?.id === ch.id ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`} dir="rtl">
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><Hash className="w-4 h-4" /></div>
                {ch.messages.length > 0 && <Badge className="absolute -top-1 -left-1 h-4 min-w-4 px-1 text-[10px] bg-emerald-500 text-white border-0">{ch.messages.length}</Badge>}
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-sm font-medium truncate">{ch.name}</p>
                <p className="text-[10px] text-white/50">{ch.members.length} عضو</p>
              </div>
            </button>
          ))}
        </div>
        <div className="px-3 py-2 border-t border-white/10"><p className="text-[9px] text-white/30">Z.ai Chat</p></div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {!activeChannel ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4"><Hash className="w-8 h-8 text-[#1E3A8A]" /></div>
            <h3 className="text-lg font-bold text-gray-700 mb-1" dir="rtl">اختر قناة</h3>
            <p className="text-sm text-gray-400" dir="rtl">اختر قناة من القائمة لعرض الرسائل</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3" dir="rtl">
                <div className="w-9 h-9 rounded-lg bg-[#1E3A8A] flex items-center justify-center"><Hash className="w-4 h-4 text-white" /></div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{activeChannel.name}</h3>
                  <p className="text-xs text-gray-400">{activeChannel.members.length} عضو</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={handleVoiceCall} disabled={callStatus !== 'idle'} className="w-8 h-8 rounded-lg hover:bg-emerald-50 flex items-center justify-center disabled:opacity-50">
                  <Phone className="w-4 h-4 text-emerald-600" />
                </button>
                <button className="w-8 h-8 rounded-lg hover:bg-gray-50 flex items-center justify-center"><Users className="w-4 h-4 text-gray-500" /></button>
              </div>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {channelMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full"><p className="text-sm text-gray-400" dir="rtl">لا توجد رسائل بعد</p></div>
              ) : (
                channelMessages.map((msg) => {
                  const isMine = msg.senderId === currentUser?.id;
                  const isFileMsg = msg.type === 'ملف' || msg.type === 'صورة' || msg.type === 'صوت' || msg.fileUrl;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'flex-row-reverse' : 'flex-row'} items-start gap-2`} dir="rtl">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">
                        {msg.sender?.name?.charAt(0) || '?'}
                      </div>
                      <div className="max-w-[80%]">
                        <p className="text-[10px] text-gray-400 mb-0.5 px-1">{msg.sender?.name} • {formatTime(msg.createdAt)}</p>
                        {isFileMsg ? (
                          <ChannelFileMessage msg={msg} isMine={isMine} />
                        ) : (
                          <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${isMine ? 'bg-[#1E3A8A] text-white rounded-br-md' : 'bg-gray-100 text-gray-800 rounded-bl-md'}`}>
                            {msg.content}
                          </div>
                        )}
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
                <Input placeholder="اكتب رسالتك في القناة..." value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} className="flex-1 h-11 bg-gray-50 border-gray-200 rounded-xl text-sm" dir="rtl" />
                <Button onClick={handleSend} disabled={(!inputText.trim() && !selectedFile) || sending || uploading} className="h-11 w-11 p-0 rounded-xl bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 shrink-0">
                  {sending || uploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white rotate-180" />}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
