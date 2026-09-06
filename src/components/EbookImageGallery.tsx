import React, { useState, useRef, useEffect } from 'react';
import { ProductImage } from '../types';
import { 
  UploadCloud, 
  Trash2, 
  Star, 
  MoveLeft, 
  MoveRight, 
  RefreshCw, 
  Plus, 
  Image as ImageIcon, 
  AlertCircle, 
  Eye, 
  X, 
  GripVertical,
  Link as LinkIcon
} from 'lucide-react';
import { uploadImageWithFallback, getInstantPreviewUrl, revokeInstantPreviewUrl } from '../lib/imageUtils';

interface EbookImageGalleryProps {
  images: ProductImage[];
  onChange: (updatedImages: ProductImage[]) => void;
  maxImages?: number;
  isDigital?: boolean;
}

export const EbookImageGallery: React.FC<EbookImageGalleryProps> = ({
  images,
  onChange,
  maxImages = 15,
  isDigital = true
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Drag and drop reordering state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [replaceTargetIndex, setReplaceTargetIndex] = useState<number | null>(null);

  // Set of removed image IDs to cancel and discard any in-flight background uploads
  const removedIdsRef = useRef<Set<string>>(new Set());

  // Latest images ref to safely perform async merges without stale closures
  const imagesRef = useRef<ProductImage[]>(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  // Clean up blob URLs when component unmounts
  useEffect(() => {
    return () => {
      imagesRef.current.forEach((img) => {
        revokeInstantPreviewUrl(img.url);
      });
    };
  }, []);

  // Validate File (Type and Size)
  const validateFile = (file: File): string | null => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    const maxSizeBytes = 25 * 1024 * 1024; // 25MB limit per image

    const isTypeValid = validTypes.includes(file.type.toLowerCase()) || 
      /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name);

    if (!isTypeValid) {
      return `Invalid format (${file.name}). Only JPG, PNG, WebP, GIF, and SVG images are allowed.`;
    }

    if (file.size > maxSizeBytes) {
      return `File too large (${file.name}). Maximum size is 25MB per image.`;
    }

    return null;
  };

  // Helper to re-index display orders and enforce primary status
  const normalizeImageOrders = (items: ProductImage[]): ProductImage[] => {
    if (items.length === 0) return [];

    let hasPrimary = items.some(img => img.isPrimary);
    return items.map((img, idx) => ({
      ...img,
      displayOrder: idx,
      isPrimary: hasPrimary ? img.isPrimary : idx === 0
    }));
  };

  // Process multi-file upload with IMMEDIATE visual feedback (0ms latency)
  const processFiles = async (files: FileList | File[]) => {
    setErrorMessage('');
    const fileList = Array.from(files);

    const currentImages = imagesRef.current;
    if (currentImages.length + fileList.length > maxImages) {
      setErrorMessage(`Maximum limit reached. You can upload up to ${maxImages} images per item.`);
      return;
    }

    const validFiles = fileList.filter((file) => {
      const error = validateFile(file);
      if (error) {
        setErrorMessage(error);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Check if the current list only contains the single initial placeholder cover
    const isSingleDefaultCover =
      currentImages.length === 1 &&
      (currentImages[0].url.includes('images.unsplash.com/photo-1544716278-ca5e3f4abd8c') ||
       currentImages[0].fileName === 'Cover Image');

    const baseList = isSingleDefaultCover ? [] : currentImages;

    // 1. INSTANT OPTIMISTIC DISPLAY: create local items and display them immediately (0ms)
    const instantItems: { file: File; item: ProductImage }[] = validFiles.map((file, idx) => {
      const instantUrl = getInstantPreviewUrl(file);
      const imgId = `img_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
      const sizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

      return {
        file,
        item: {
          id: imgId,
          url: instantUrl,
          displayOrder: baseList.length + idx,
          isPrimary: baseList.length === 0 && idx === 0,
          createdAt: new Date().toISOString(),
          fileName: file.name,
          fileSize: sizeFormatted,
          isOptimizing: true
        }
      };
    });

    // Notify parent immediately so images appear instantly
    const initialCombined = normalizeImageOrders([...baseList, ...instantItems.map(i => i.item)]);
    onChange(initialCombined);

    // Reset native input so user can pick same file again if desired
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // 2. PARALLEL BACKGROUND PROCESSING: Compress & sync assets in background
    instantItems.forEach(async ({ file, item }) => {
      try {
        const permanentUrl = await uploadImageWithFallback(file, 'products', item.id);

        // If user removed this image while it was uploading, discard it!
        if (removedIdsRef.current.has(item.id)) {
          revokeInstantPreviewUrl(item.url);
          return;
        }

        // Revoke temporary blob URL
        revokeInstantPreviewUrl(item.url);

        // Update with permanent URL and clear isOptimizing
        const latest = imagesRef.current;
        const updated = latest.map((img) => {
          if (img.id === item.id) {
            return {
              ...img,
              url: permanentUrl,
              isOptimizing: false
            };
          }
          return img;
        });

        onChange(normalizeImageOrders(updated));
      } catch (err: any) {
        // If upload failed but image was not removed, keep local preview and clear spinner
        if (!removedIdsRef.current.has(item.id)) {
          const latest = imagesRef.current;
          const updated = latest.map((img) =>
            img.id === item.id ? { ...img, isOptimizing: false } : img
          );
          onChange(normalizeImageOrders(updated));
          console.warn('Background image optimization note:', err);
        }
      }
    });
  };

  // Drag and drop handlers for upload zone
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  // Add Image by URL
  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    if (images.length >= maxImages) {
      setErrorMessage(`Maximum limit reached (${maxImages} images).`);
      return;
    }

    const isSingleDefaultCover =
      images.length === 1 &&
      (images[0].url.includes('images.unsplash.com/photo-1544716278-ca5e3f4abd8c') ||
       images[0].fileName === 'Cover Image');

    const baseList = isSingleDefaultCover ? [] : images;

    const newImg: ProductImage = {
      id: `img-url-${Date.now()}`,
      url: urlInput.trim(),
      displayOrder: baseList.length,
      isPrimary: baseList.length === 0,
      createdAt: new Date().toISOString(),
      fileName: 'External Image URL',
      isOptimizing: false
    };

    const combined = normalizeImageOrders([...baseList, newImg]);
    onChange(combined);
    setUrlInput('');
    setShowUrlInput(false);
  };

  // Set image as Cover / Primary
  const handleSetPrimary = (index: number) => {
    const updated = images.map((img, idx) => ({
      ...img,
      isPrimary: idx === index
    }));
    
    // Move primary image to index 0
    const primaryObj = updated[index];
    const rest = updated.filter((_, idx) => idx !== index);
    const reordered = [primaryObj, ...rest];

    onChange(normalizeImageOrders(reordered));
  };

  // REMOVE IMAGE IMMEDIATELY (0ms latency, guaranteed no resurrection)
  const handleRemoveImage = (index: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const targetImg = images[index];
    if (targetImg) {
      // Mark ID as removed so background tasks discard it
      removedIdsRef.current.add(targetImg.id);
      revokeInstantPreviewUrl(targetImg.url);
    }

    const remaining = images.filter((_, idx) => idx !== index);
    onChange(normalizeImageOrders(remaining));
  };

  // Clear all images immediately
  const handleClearAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    images.forEach((img) => {
      removedIdsRef.current.add(img.id);
      revokeInstantPreviewUrl(img.url);
    });
    onChange([]);
  };

  // Move image left/up or right/down
  const handleMove = (index: number, direction: 'prev' | 'next', e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const targetIndex = direction === 'prev' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const copy = [...images];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    onChange(normalizeImageOrders(copy));
  };

  // Replace individual image immediately
  const triggerReplace = (index: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setReplaceTargetIndex(index);
    if (replaceInputRef.current) {
      replaceInputRef.current.click();
    }
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (replaceTargetIndex === null || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    const err = validateFile(file);
    if (err) {
      setErrorMessage(err);
      return;
    }

    const targetIndex = replaceTargetIndex;
    const targetImg = images[targetIndex];
    if (!targetImg) return;

    // 1. Instantly replace thumbnail preview (0ms)
    const instantUrl = getInstantPreviewUrl(file);
    const updatedWithInstant = images.map((img, idx) => {
      if (idx === targetIndex) {
        return {
          ...img,
          url: instantUrl,
          fileName: file.name,
          fileSize: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
          isOptimizing: true
        };
      }
      return img;
    });

    onChange(normalizeImageOrders(updatedWithInstant));
    setReplaceTargetIndex(null);
    if (replaceInputRef.current) {
      replaceInputRef.current.value = '';
    }

    // 2. Background optimize and update
    try {
      const permanentUrl = await uploadImageWithFallback(file, 'products', `prod_img_rep_${Date.now()}`);

      // Check if image was removed while processing
      if (removedIdsRef.current.has(targetImg.id)) {
        revokeInstantPreviewUrl(instantUrl);
        return;
      }

      revokeInstantPreviewUrl(instantUrl);
      const latest = imagesRef.current;
      const updatedPermanent = latest.map((img) => {
        if (img.id === targetImg.id) {
          return {
            ...img,
            url: permanentUrl,
            isOptimizing: false
          };
        }
        return img;
      });

      onChange(normalizeImageOrders(updatedPermanent));
    } catch (replaceErr: any) {
      if (!removedIdsRef.current.has(targetImg.id)) {
        const latest = imagesRef.current;
        const updatedFallback = latest.map((img) =>
          img.id === targetImg.id ? { ...img, isOptimizing: false } : img
        );
        onChange(normalizeImageOrders(updatedFallback));
      }
    }
  };

  // Drag and Drop reordering handlers for thumbnails
  const handleCardDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCardDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const reordered = [...images];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, moved);

    setDraggedIndex(index);
    onChange(normalizeImageOrders(reordered));
  };

  return (
    <div className="space-y-4 text-left">
      {/* Hidden file input for replacing individual images */}
      <input
        type="file"
        ref={replaceInputRef}
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/svg+xml"
        onChange={handleReplaceFile}
        className="hidden"
      />

      {/* Hidden file input for general browse button */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/svg+xml"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-purple-400" />
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
            {isDigital ? 'E-book Cover & Preview Gallery' : 'Product Image Gallery'}
          </h3>
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold">
            {images.length} / {maxImages} Uploaded
          </span>
        </div>

        <div className="flex items-center gap-3">
          {images.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] font-bold text-rose-500 hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
              title="Remove all gallery images"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[11px] font-bold text-cyan-500 hover:text-cyan-400 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>{showUrlInput ? 'Hide URL Input' : 'Add by URL'}</span>
          </button>
        </div>
      </div>

      {/* URL Input Bar */}
      {showUrlInput && (
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-2 animate-in fade-in duration-200">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste image URL (https://...)"
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-cyan-500 text-slate-900 dark:text-white"
          />
          <button
            type="button"
            onClick={handleAddUrl}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      )}

      {/* Drag & Drop Upload Drop Zone - Always responsive without blocking */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-purple-400 bg-purple-500/10 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-purple-500/50 hover:bg-purple-50/30 dark:hover:bg-purple-950/10'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shadow-inner">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <p className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
              Drag & drop images here, or click to browse
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Uploads display instantly. Main Cover, Table of Contents, Chapter Previews (JPG, PNG, WebP)
            </p>
          </div>
          <button
            type="button"
            className="mt-1 inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow text-xs transition-all pointer-events-none"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Select Images from Device</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 font-bold rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="p-1 text-red-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Gallery Cards Grid */}
      {images.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-slate-400 flex items-center gap-1 font-semibold">
            <GripVertical className="w-3.5 h-3.5 text-purple-400" />
            <span>Drag thumbnails to reorder. Image #1 is the Primary Cover Image. Tap 'X' to remove immediately.</span>
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((img, idx) => (
              <div
                key={img.id || `img-${idx}`}
                draggable
                onDragStart={(e) => handleCardDragStart(e, idx)}
                onDragOver={(e) => handleCardDragOver(e, idx)}
                className={`group relative rounded-2xl border bg-slate-900 overflow-hidden shadow-md transition-all ${
                  img.isPrimary || idx === 0
                    ? 'border-purple-500 ring-2 ring-purple-500/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Thumbnail Image Container */}
                <div className="relative aspect-3/4 w-full bg-slate-950 overflow-hidden">
                  <img
                    src={img.url}
                    alt={`Preview ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Primary Cover Badge */}
                  {(img.isPrimary || idx === 0) ? (
                    <span className="absolute top-2 left-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-md shadow-lg flex items-center gap-1 z-20">
                      <Star className="w-3 h-3 fill-amber-300 text-amber-300" /> Primary Cover
                    </span>
                  ) : (
                    <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-md text-slate-300 font-extrabold text-[10px] px-2 py-0.5 rounded-md z-20">
                      Preview #{idx + 1}
                    </span>
                  )}

                  {/* ALWAYS-VISIBLE INSTANT REMOVE BUTTON (Top-Right) */}
                  <button
                    type="button"
                    onClick={(e) => handleRemoveImage(idx, e)}
                    title="Remove Image Immediately"
                    className="absolute top-2 right-2 z-30 p-1.5 rounded-full bg-slate-950/85 hover:bg-rose-600 text-slate-300 hover:text-white border border-slate-700/80 shadow-lg transition-all cursor-pointer active:scale-90"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* Optimizing background badge */}
                  {img.isOptimizing && (
                    <div className="absolute bottom-2 left-2 z-20 bg-slate-950/90 backdrop-blur-md px-2 py-0.5 rounded-md text-[9px] font-bold text-cyan-300 flex items-center gap-1 border border-cyan-500/40 shadow">
                      <RefreshCw className="w-2.5 h-2.5 text-cyan-400 animate-spin" />
                      <span>Optimizing...</span>
                    </div>
                  )}

                  {/* Action Overlay Buttons (on hover) */}
                  <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 z-20">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPreviewImage(img.url); }}
                        title="View Full Resolution"
                        className="p-1.5 bg-slate-900/90 text-slate-200 hover:text-white rounded-lg hover:bg-purple-600 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleRemoveImage(idx, e)}
                        title="Delete Image Immediately"
                        className="p-1.5 bg-rose-500/20 text-rose-400 hover:text-white rounded-lg hover:bg-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {!img.isPrimary && idx !== 0 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleSetPrimary(idx); }}
                          className="w-full py-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black rounded-lg shadow flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Star className="w-3 h-3 fill-current" /> Set as Cover
                        </button>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={(e) => handleMove(idx, 'prev', e)}
                          title="Move Left/Up"
                          className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded-lg text-[10px] flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <MoveLeft className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => triggerReplace(idx, e)}
                          title="Replace Image File"
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg text-[10px] font-bold flex items-center gap-0.5 cursor-pointer transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === images.length - 1}
                          onClick={(e) => handleMove(idx, 'next', e)}
                          title="Move Right/Down"
                          className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded-lg text-[10px] flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <MoveRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer Info */}
                <div className="p-2 text-[10px] text-slate-400 truncate border-t border-slate-800 flex items-center justify-between">
                  <span className="truncate max-w-[100px]">{img.fileName || `Image ${idx + 1}`}</span>
                  {img.fileSize && <span className="text-[9px] font-mono text-slate-500">{img.fileSize}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center cursor-default"
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-slate-400 hover:text-white p-2 rounded-full cursor-pointer transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewImage}
              alt="Full Preview"
              referrerPolicy="no-referrer"
              className="max-h-[80vh] w-auto object-contain rounded-2xl shadow-2xl border border-slate-800"
            />
          </div>
        </div>
      )}
    </div>
  );
};
