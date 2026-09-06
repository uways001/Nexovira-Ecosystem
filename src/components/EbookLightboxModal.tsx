import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Star, ZoomIn } from 'lucide-react';

interface EbookLightboxModalProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  title?: string;
}

export const EbookLightboxModal: React.FC<EbookLightboxModalProps> = ({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  title = 'E-Book Image Gallery'
}) => {
  if (!isOpen || !images || images.length === 0) return null;

  const validIndex = Math.max(0, Math.min(currentIndex, images.length - 1));
  const activeImage = images[validIndex];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onNavigate((validIndex - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') onNavigate((validIndex + 1) % images.length);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [validIndex, images.length, onClose, onNavigate]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between text-white border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black text-purple-400 bg-purple-500/10 border border-purple-500/30 px-3 py-1 rounded-full uppercase tracking-wider">
            {title}
          </span>
          <span className="text-xs font-bold text-slate-400">
            Image {validIndex + 1} of {images.length}
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors border border-slate-800 cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Image Stage */}
      <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
        {/* Previous Button */}
        {images.length > 1 && (
          <button
            onClick={() => onNavigate((validIndex - 1 + images.length) % images.length)}
            className="absolute left-2 sm:left-6 z-10 p-3 bg-slate-900/80 hover:bg-purple-600 text-white rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md transition-colors cursor-pointer"
            title="Previous Image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Active Image */}
        <div className="relative max-h-full max-w-4xl flex items-center justify-center p-2">
          <img
            src={activeImage}
            alt={`Page ${validIndex + 1}`}
            referrerPolicy="no-referrer"
            className="max-h-[70vh] sm:max-h-[75vh] w-auto object-contain rounded-2xl shadow-2xl border border-slate-800/80"
          />

          {validIndex === 0 && (
            <span className="absolute top-4 left-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs uppercase px-3 py-1 rounded-lg shadow-lg flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              Primary E-book Cover
            </span>
          )}
        </div>

        {/* Next Button */}
        {images.length > 1 && (
          <button
            onClick={() => onNavigate((validIndex + 1) % images.length)}
            className="absolute right-2 sm:right-6 z-10 p-3 bg-slate-900/80 hover:bg-purple-600 text-white rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md transition-colors cursor-pointer"
            title="Next Image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-3 overflow-x-auto pt-4 border-t border-slate-800/80 max-w-4xl mx-auto w-full">
          {images.map((imgUrl, i) => (
            <button
              key={i}
              onClick={() => onNavigate(i)}
              className={`relative w-14 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                validIndex === i
                  ? 'border-purple-500 scale-105 ring-2 ring-purple-500/40 opacity-100'
                  : 'border-slate-800 opacity-50 hover:opacity-100'
              }`}
            >
              <img src={imgUrl} alt={`Thumb ${i + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              {i === 0 && (
                <span className="absolute bottom-0 inset-x-0 bg-purple-600/90 text-white text-[8px] font-black text-center py-0.5">
                  COVER
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
