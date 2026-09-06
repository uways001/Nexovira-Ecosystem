import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, X, RefreshCw, Link as LinkIcon, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { uploadImageWithFallback, getInstantPreviewUrl, revokeInstantPreviewUrl } from '../lib/imageUtils';

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  onUploadStateChange?: (uploading: boolean) => void;
  label?: string;
  helperText?: string;
  folder?: string;
  aspectRatio?: 'square' | 'video' | 'wide' | 'auto';
  required?: boolean;
  disabled?: boolean;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  value,
  onChange,
  onUploadStateChange,
  label = 'Image Upload',
  helperText = 'Upload JPG, PNG or WebP from your device. Auto-optimized.',
  folder = 'uploads',
  aspectRatio = 'video',
  required = false,
  disabled = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [optimisticPreview, setOptimisticPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Upload sequence ref to cancel and discard stale or removed uploads
  const uploadSeqRef = useRef<number>(0);

  // Clean up any blob preview URL when unmounting
  useEffect(() => {
    return () => {
      if (optimisticPreview) {
        revokeInstantPreviewUrl(optimisticPreview);
      }
    };
  }, [optimisticPreview]);

  // Notify parent of uploading state
  useEffect(() => {
    onUploadStateChange?.(isUploading);
  }, [isUploading, onUploadStateChange]);

  // Display URL prioritizes the instant preview, otherwise fallback to value
  const displayUrl = optimisticPreview || value;

  // Immediate and absolute image removal
  const handleImmediateRemove = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // 1. Invalidate any in-progress background upload so it cannot restore the image
    uploadSeqRef.current += 1;

    // 2. Revoke any ephemeral object URL to free memory
    if (optimisticPreview) {
      revokeInstantPreviewUrl(optimisticPreview);
    }

    // 3. Immediately clear all state and notify parent
    setOptimisticPreview(null);
    setIsUploading(false);
    setErrorMessage('');
    onChange('');

    // 4. Reset file input element so selecting the same file triggers change immediately
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFile = async (file: File) => {
    setErrorMessage('');
    if (!file.type.startsWith('image/') && !/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name)) {
      setErrorMessage('Please select a valid image file (JPG, PNG, WebP, GIF, SVG).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds 25MB. Please choose a smaller image.');
      return;
    }

    // 1. Instantly display image preview with 0ms latency for visual confirmation
    const instantPreviewUrl = getInstantPreviewUrl(file);
    setOptimisticPreview(instantPreviewUrl);

    // Reset file input so re-selecting same file works
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // 2. Upload and optimize in background with active sequence token
    const currentSeq = ++uploadSeqRef.current;
    setIsUploading(true);

    try {
      const permanentUrl = await uploadImageWithFallback(file, folder);

      // Only apply if user hasn't removed or replaced the image while uploading!
      if (uploadSeqRef.current === currentSeq) {
        onChange(permanentUrl);
        revokeInstantPreviewUrl(instantPreviewUrl);
        setOptimisticPreview(null);
      }
    } catch (err: any) {
      if (uploadSeqRef.current === currentSeq) {
        console.warn('Image upload error:', err);
        setErrorMessage(err.message || 'Failed to process image upload.');
        setOptimisticPreview(null);
      }
    } finally {
      if (uploadSeqRef.current === currentSeq) {
        setIsUploading(false);
      }
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragActive(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const aspectClass =
    aspectRatio === 'square'
      ? 'aspect-square'
      : aspectRatio === 'wide'
      ? 'aspect-[21/9]'
      : aspectRatio === 'video'
      ? 'aspect-[16/9]'
      : 'min-h-[160px]';

  return (
    <div className="space-y-2 text-left">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setShowUrlFallback(!showUrlFallback)}
          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
        >
          <LinkIcon className="w-3 h-3" />
          <span>{showUrlFallback ? 'Hide URL link option' : 'Or paste image link'}</span>
        </button>
      </div>

      {showUrlFallback && (
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 animate-fadeIn">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Direct Image URL (e.g. Unsplash, CDN):</span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={displayUrl}
              onChange={(e) => {
                uploadSeqRef.current += 1;
                setOptimisticPreview(null);
                onChange(e.target.value);
              }}
              placeholder="https://images.unsplash.com/..."
              disabled={disabled}
              className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
            {displayUrl && (
              <button
                type="button"
                onClick={handleImmediateRemove}
                className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                title="Remove immediately"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Upload Dropzone or Preview */}
      {displayUrl ? (
        <div className={`relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 group ${aspectClass}`}>
          <img
            src={displayUrl}
            alt="Preview"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />

          {/* Always-visible Quick Remove Button (Top Right) */}
          <button
            type="button"
            onClick={handleImmediateRemove}
            disabled={disabled}
            title="Remove Image Immediately"
            className="absolute top-2.5 right-2.5 z-30 p-2 rounded-full bg-slate-950/85 hover:bg-rose-600 text-slate-200 hover:text-white border border-slate-700/80 shadow-xl transition-all cursor-pointer active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Hover Action Overlay */}
          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-xs z-20">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || disabled}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg transition-transform hover:scale-105 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Replace Image</span>
            </button>
            <button
              type="button"
              onClick={handleImmediateRemove}
              disabled={disabled}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg transition-transform hover:scale-105 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Immediately</span>
            </button>
          </div>

          <div className="absolute top-2.5 left-2.5 z-20 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold text-emerald-400 flex items-center gap-1 border border-emerald-500/30 shadow">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Image Attached</span>
          </div>

          {isUploading && (
            <div className="absolute bottom-2.5 right-2.5 z-20 bg-slate-950/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold text-cyan-300 flex items-center gap-1.5 border border-cyan-500/40 shadow">
              <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
              <span>Optimizing...</span>
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${aspectClass} ${
            dragActive
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
              : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 hover:border-blue-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Processing & Optimizing Image...</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Click to upload or drag & drop image
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {helperText}
                </p>
              </div>
              <button
                type="button"
                className="mt-1 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold inline-flex items-center gap-1.5 shadow-sm pointer-events-none"
              >
                <ImageIcon className="w-3 h-3" />
                <span>Browse File</span>
              </button>
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold mt-1 animate-shake">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        onChange={onFileChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
};
