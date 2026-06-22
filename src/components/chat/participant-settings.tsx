'use client';

import { useState } from 'react';
import { X, Settings, Bell } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useAppState, setState, type User } from '@/components/chat';

interface ToggleSetting { id: string; label: string; enabled: boolean; }

export function ParticipantSettings() {
  const showParticipantSettings = useAppState(s => s.showParticipantSettings);
  const selectedParticipant = useAppState(s => s.selectedParticipant);
  const [settings, setSettings] = useState<ToggleSetting[]>([
    { id: 'chat', label: 'إشعارات الدردشة', enabled: true },
    { id: 'newMessages', label: 'رسائل جديدة', enabled: true },
    { id: 'voice', label: 'إشعارات الصوتية', enabled: false },
    { id: 'share', label: 'إشعارات المشاركة', enabled: true },
    { id: 'file', label: 'إشعارات الملفات', enabled: true },
  ]);

  const toggleSetting = (id: string) => setSettings(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));

  const statusOptions = [
    { label: 'متاح', color: 'bg-amber-500', value: 'متاح' },
    { label: 'غير متاح', color: 'bg-red-500', value: 'غير متاح' },
    { label: 'متصل', color: 'bg-emerald-500', value: 'متصل' },
  ];

  if (!selectedParticipant) return null;

  return (
    <Dialog open={showParticipantSettings} onOpenChange={(open) => setState({ showParticipantSettings: open })}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-xl [&>button]:hidden">
        <div className="bg-[#1E3A8A] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setState({ showParticipantSettings: false })} className="text-white/80 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            <DialogTitle className="text-white text-base font-bold">إعدادات المشارك</DialogTitle>
          </div>
          <div className="bg-white/10 p-2 rounded-full"><Settings className="w-5 h-5 text-white" /></div>
        </div>
        <div className="px-6 py-5 space-y-5" dir="rtl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-bold border-3 border-[#1E3A8A]/20">{selectedParticipant.name.charAt(0)}</div>
            <div>
              <h3 className="font-bold text-gray-900">{selectedParticipant.name}</h3>
              <p className="text-sm text-gray-500">{selectedParticipant.role}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-2 h-2 rounded-full ${selectedParticipant.status === 'متصل' ? 'bg-emerald-500' : selectedParticipant.status === 'متاح' ? 'bg-amber-500' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-400">{selectedParticipant.status}</span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">الوضع</p>
            <div className="space-y-2">
              {statusOptions.map((opt) => (
                <div key={opt.value} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${opt.color}`} />
                  <span className="text-sm text-gray-600">{opt.label}</span>
                  {selectedParticipant.status === opt.value && <Badge className="text-[10px] bg-blue-50 text-blue-600 border-blue-200 mr-auto">الحالي</Badge>}
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-gray-100" />
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">إشعارات الدردشة</p>
            <div className="space-y-3">
              {settings.map((setting) => (
                <div key={setting.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><Bell className="w-3.5 h-3.5 text-gray-500" /></div>
                    <span className="text-sm text-gray-600">{setting.label}</span>
                  </div>
                  <Switch checked={setting.enabled} onCheckedChange={() => toggleSetting(setting.id)} />
                </div>
              ))}
            </div>
          </div>
          <Button onClick={() => setState({ showParticipantSettings: false })} className="w-full h-11 bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white rounded-lg font-medium">حفظ الإعدادات</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
