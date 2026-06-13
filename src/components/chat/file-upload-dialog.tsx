/**
 * FileUploadDialog — Attachment picker for chat messages.
 * Supports PDF, PNG, JPEG, Word files with drag & drop and preview.
 */
'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  Image,
  Upload,
  X,
  FileIcon,
  Loader2,
  AlertCircle,
  File,
} from 'lucide-react';

interface UploadedFile {
  url: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  category: 'image' | 'pdf' | 'document';
}

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileSelected: (file: UploadedFile) => void;
  token: string;
}

const ACCEPTED_TYPES = '.pdf,.png,.jpg,.jpeg,.doc,.docx';
const ACCEPTED_MIMES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimetype: string, size = 'w-5 h-5') {
  if (mimetype.startsWith('image/')) return <Image className={`${size} text-blue-500`} aria-hidden="true" />;
  if (mimetype === 'application/pdf') return <FileText className={`${size} text-red-500`} />;
  return <FileIcon className={`${size} text-blue-600`} />;
}

function getFileColor(category: string) {
  switch (category) {
    case 'image': return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50';
    case 'pdf': return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50';
    default: return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50';
  }
}

export function FileUploadDialog({ open, onOpenChange, onFileSelected, token }: FileUploadDialogProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setError('');
    setProgress(0);
    setPreview(null);
    setUploading(false);
  }, []);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Validate type
    if (!ACCEPTED_MIMES.includes(file.type)) {
      setError('نوع الملف غير مدعوم. يُرجى اختيار: PDF, PNG, JPEG, Word');
      return;
    }

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('حجم الملف يتجاوز 10 ميجابايت');
      return;
    }

    setError('');

    // Show preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreview({ file, url: reader.result as string });
      };
      reader.readAsDataURL(file);
    } else {
      setPreview({ file, url: '' });
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!preview) return;
    setUploading(true);
    setError('');
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', preview.file);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 15, 90));
      }, 300);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'فشل رفع الملف');
      }

      setProgress(100);
      const data: UploadedFile = await res.json();

      // Small delay for UX
      await new Promise((r) => setTimeout(r, 300));

      onFileSelected(data);
      resetState();
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء الرفع');
    } finally {
      setUploading(false);
    }
  }, [preview, token, onFileSelected, resetState, onOpenChange]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }} dir="rtl">
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-600" />
            إرفاق ملف
          </DialogTitle>
        </DialogHeader>

        {/* Drop zone */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer ${
            dragOver
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 scale-[1.02]'
              : preview
                ? 'border-transparent p-2'
                : 'border-border hover:border-emerald-400 hover:bg-muted/50'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !preview && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          {preview ? (
            <div className="flex flex-col items-center gap-3">
              {/* Image preview */}
              {preview.file.type.startsWith('image/') && preview.url && (
                <div className="relative w-full max-h-48 rounded-lg overflow-hidden border">
                  <img
                    src={preview.url}
                    alt="معاينة"
                    className="w-full h-full object-contain max-h-48"
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); resetState(); }}
                    className="absolute top-2 left-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* File info */}
              <div className={`w-full flex items-center gap-3 p-3 rounded-lg border ${getFileColor(preview.file.type === 'application/pdf' ? 'pdf' : preview.file.type.startsWith('image/') ? 'image' : 'document')}`}>
                {getFileIcon(preview.file.type)}
                <div className="flex-1 text-right min-w-0">
                  <p className="text-sm font-medium truncate">{preview.file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(preview.file.size)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); resetState(); }}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <Upload className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium">اسحب الملف هنا أو انقر للاختيار</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPEG, Word — حتى 10 ميجابايت</p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                  <FileText className="w-3 h-3" /> PDF
                </span>
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                  <Image className="w-3 h-3" /> PNG
                </span>
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                  <Image className="w-3 h-3" /> JPEG
                </span>
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                  <File className="w-3 h-3" /> Word
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-2 rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Progress */}
        {uploading && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              {progress < 100 ? 'جاري الرفع...' : 'تم الرفع ✓'}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2" dir="rtl">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => { resetState(); onOpenChange(false); }}
            disabled={uploading}
          >
            إلغاء
          </Button>
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleUpload}
            disabled={!preview || uploading}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
            ) : (
              <Upload className="w-4 h-4 ml-2" />
            )}
            إرسال الملف
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}