import React, { useState } from 'react';
import logoPngImg from '../assets/Logo.jpeg';

interface NexoviraLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
  showTagline?: boolean;
  taglineClassName?: string;
  imgClassName?: string;
  variant?: 'vector' | 'image';
}

export const NexoviraLogo: React.FC<NexoviraLogoProps> = ({
  className = '',
  size = 36,
  showText = true,
  textClassName = 'text-xl font-bold tracking-tight',
  showTagline = false,
  taglineClassName = 'text-[10px] sm:text-xs font-semibold text-cyan-500 dark:text-cyan-400',
  imgClassName = '',
  variant = 'image',
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Official Nexovira Emblem Icon with Logo.png */}
      <div 
        className="relative flex items-center justify-center shrink-0 overflow-hidden rounded-xl bg-slate-950 border border-cyan-500/30 shadow-md shadow-cyan-500/15 transition-transform duration-300 hover:scale-105"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        {variant === 'image' && !imgError ? (
          <img
            src={logoPngImg || '/Logo.jpeg'}
            alt="NEXOVIRA Logo"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className={`w-full h-full object-cover rounded-xl ${imgClassName}`}
          />
        ) : (
          <svg
            viewBox="0 0 512 512"
            className={`w-full h-full ${imgClassName}`}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id={`nexoCenterGlow-${size}`} cx="38%" cy="32%" r="68%">
                <stop offset="0%" stopColor="#A5F3FC" />
                <stop offset="25%" stopColor="#38BDF8" />
                <stop offset="60%" stopColor="#0284C7" />
                <stop offset="90%" stopColor="#0369A1" />
                <stop offset="100%" stopColor="#075985" />
              </radialGradient>

              <radialGradient id={`nexoHeadGlow-${size}`} cx="38%" cy="32%" r="68%">
                <stop offset="0%" stopColor="#7DD3FC" />
                <stop offset="30%" stopColor="#0284C7" />
                <stop offset="70%" stopColor="#0369A1" />
                <stop offset="100%" stopColor="#0C4A6E" />
              </radialGradient>

              <linearGradient id={`nexoArmGrad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="40%" stopColor="#0284C7" />
                <stop offset="80%" stopColor="#0369A1" />
                <stop offset="100%" stopColor="#0284C7" />
              </linearGradient>

              <filter id={`nexoEmblemGlow-${size}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Dark background inside emblem container */}
            <rect width="512" height="512" fill="#000000" />

            <g filter={`url(#nexoEmblemGlow-${size})`}>
              {/* Central Core Sphere */}
              <circle
                cx="256"
                cy="256"
                r="34"
                fill={`url(#nexoCenterGlow-${size})`}
                stroke="#38BDF8"
                strokeWidth="1.5"
              />

              {/* Quadrant 1: Top-Right */}
              <g>
                <circle
                  cx="346"
                  cy="148"
                  r="22"
                  fill={`url(#nexoHeadGlow-${size})`}
                  stroke="#7DD3FC"
                  strokeWidth="1.5"
                />
                <path
                  d="M 268 78 C 278 78, 284 84, 284 96 C 284 135, 305 168, 342 188 C 378 208, 400 216, 416 220 C 424 222, 428 228, 428 236 C 428 244, 422 250, 412 250 C 365 250, 318 228, 282 192 C 264 174, 256 150, 256 120 L 256 90 C 256 82, 260 78, 268 78 Z"
                  fill={`url(#nexoArmGrad-${size})`}
                />
              </g>

              {/* Quadrant 2: Bottom-Right */}
              <g transform="rotate(90 256 256)">
                <circle
                  cx="346"
                  cy="148"
                  r="22"
                  fill={`url(#nexoHeadGlow-${size})`}
                  stroke="#7DD3FC"
                  strokeWidth="1.5"
                />
                <path
                  d="M 268 78 C 278 78, 284 84, 284 96 C 284 135, 305 168, 342 188 C 378 208, 400 216, 416 220 C 424 222, 428 228, 428 236 C 428 244, 422 250, 412 250 C 365 250, 318 228, 282 192 C 264 174, 256 150, 256 120 L 256 90 C 256 82, 260 78, 268 78 Z"
                  fill={`url(#nexoArmGrad-${size})`}
                />
              </g>

              {/* Quadrant 3: Bottom-Left */}
              <g transform="rotate(180 256 256)">
                <circle
                  cx="346"
                  cy="148"
                  r="22"
                  fill={`url(#nexoHeadGlow-${size})`}
                  stroke="#7DD3FC"
                  strokeWidth="1.5"
                />
                <path
                  d="M 268 78 C 278 78, 284 84, 284 96 C 284 135, 305 168, 342 188 C 378 208, 400 216, 416 220 C 424 222, 428 228, 428 236 C 428 244, 422 250, 412 250 C 365 250, 318 228, 282 192 C 264 174, 256 150, 256 120 L 256 90 C 256 82, 260 78, 268 78 Z"
                  fill={`url(#nexoArmGrad-${size})`}
                />
              </g>

              {/* Quadrant 4: Top-Left */}
              <g transform="rotate(270 256 256)">
                <circle
                  cx="346"
                  cy="148"
                  r="22"
                  fill={`url(#nexoHeadGlow-${size})`}
                  stroke="#7DD3FC"
                  strokeWidth="1.5"
                />
                <path
                  d="M 268 78 C 278 78, 284 84, 284 96 C 284 135, 305 168, 342 188 C 378 208, 400 216, 416 220 C 424 222, 428 228, 428 236 C 428 244, 422 250, 412 250 C 365 250, 318 228, 282 192 C 264 174, 256 150, 256 120 L 256 90 C 256 82, 260 78, 268 78 Z"
                  fill={`url(#nexoArmGrad-${size})`}
                />
              </g>
            </g>
          </svg>
        )}
      </div>

      {showText && (
        <div className="flex flex-col text-left">
          <span className={`font-extrabold tracking-wider bg-gradient-to-r from-slate-900 via-cyan-900 to-slate-900 dark:from-white dark:via-cyan-300 dark:to-cyan-400 bg-clip-text text-transparent uppercase ${textClassName}`}>
            NEXOVIRA
          </span>
          {showTagline && (
            <span className={`tracking-normal leading-tight max-w-[280px] sm:max-w-xs ${taglineClassName}`}>
              Innovation begins with vision. Smart living, better every day.
            </span>
          )}
        </div>
      )}
    </div>
  );
};
