import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HorizontalAutoScrollRailProps {
  children: React.ReactNode;
  ariaLabel: string;
  /** Scroll speed in pixels per second (default: 22px/s for a calm, slow glide). */
  speedPxPerSec?: number;
  /** Number of child items — used to re-evaluate overflow state when items change. */
  itemCount: number;
  className?: string;
}

export const HorizontalAutoScrollRail: React.FC<HorizontalAutoScrollRailProps> = ({
  children,
  ariaLabel,
  speedPxPerSec = 22,
  itemCount,
  className = '',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isPausedRef = useRef<boolean>(false);
  const resumeTimeoutRef = useRef<number | null>(null);
  const directionRef = useRef<1 | -1>(1);
  const edgePauseUntilRef = useRef<number>(0);
  const fractionalScrollRef = useRef<number>(0);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScroll > 4 && el.scrollLeft < maxScroll - 4);
  }, []);

  const pauseTemporarily = useCallback((durationMs = 2400) => {
    isPausedRef.current = true;
    if (resumeTimeoutRef.current !== null) {
      window.clearTimeout(resumeTimeoutRef.current);
    }
    resumeTimeoutRef.current = window.setTimeout(() => {
      isPausedRef.current = false;
      resumeTimeoutRef.current = null;
    }, durationMs);
  }, []);

  const handleManualStep = (dir: -1 | 1) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    pauseTemporarily(3000);
    const stepDistance = Math.max(220, Math.round(el.clientWidth * 0.72));
    el.scrollBy({
      left: dir * stepDistance,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    updateScrollButtons();
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleResize = () => updateScrollButtons();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [itemCount, updateScrollButtons]);

  // Smooth slow continuous auto-scroll loop with prefers-reduced-motion compliance
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || itemCount <= 1) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let animationFrameId: number | null = null;
    let lastTimestamp = performance.now();

    const step = (now: number) => {
      const dtSec = Math.min(0.05, Math.max(0, (now - lastTimestamp) / 1000));
      lastTimestamp = now;

      const container = scrollContainerRef.current;
      if (container && !isPausedRef.current && now >= edgePauseUntilRef.current) {
        const maxScroll = container.scrollWidth - container.clientWidth;
        if (maxScroll > 6) {
          fractionalScrollRef.current += speedPxPerSec * dtSec * directionRef.current;
          const wholeDelta =
            fractionalScrollRef.current > 0
              ? Math.floor(fractionalScrollRef.current)
              : Math.ceil(fractionalScrollRef.current);

          if (wholeDelta !== 0) {
            fractionalScrollRef.current -= wholeDelta;
            const nextLeft = container.scrollLeft + wholeDelta;

            if (nextLeft >= maxScroll) {
              container.scrollLeft = maxScroll;
              directionRef.current = -1;
              edgePauseUntilRef.current = now + 1500;
              fractionalScrollRef.current = 0;
            } else if (nextLeft <= 0) {
              container.scrollLeft = 0;
              directionRef.current = 1;
              edgePauseUntilRef.current = now + 1500;
              fractionalScrollRef.current = 0;
            } else {
              container.scrollLeft = nextLeft;
            }
          }
        }
      }

      animationFrameId = window.requestAnimationFrame(step);
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      if (resumeTimeoutRef.current !== null) {
        window.clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, [itemCount, speedPxPerSec]);

  return (
    <div
      className={`group/rail relative ${className}`}
      onMouseEnter={() => {
        isPausedRef.current = true;
      }}
      onMouseLeave={() => {
        isPausedRef.current = false;
      }}
      onFocusCapture={() => {
        isPausedRef.current = true;
      }}
      onBlurCapture={() => {
        isPausedRef.current = false;
      }}
    >
      {/* Left Arrow Button (Desktop / Tablet Quick Scroll) */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => handleManualStep(-1)}
          aria-label={`Scroll ${ariaLabel} left`}
          className="absolute top-1/2 left-1 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-md backdrop-blur-xs transition-all hover:border-[#F85606] hover:text-[#F85606] sm:flex"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {/* Horizontal Scrollable Track */}
      <div
        ref={scrollContainerRef}
        role="region"
        aria-label={ariaLabel}
        onScroll={updateScrollButtons}
        onTouchStart={() => {
          isPausedRef.current = true;
        }}
        onTouchEnd={() => pauseTemporarily(2400)}
        onWheel={() => pauseTemporarily(2400)}
        className="no-scrollbar flex gap-3 overflow-x-auto pb-1.5"
      >
        {children}
      </div>

      {/* Right Arrow Button (Desktop / Tablet Quick Scroll) */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => handleManualStep(1)}
          aria-label={`Scroll ${ariaLabel} right`}
          className="absolute top-1/2 right-1 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-md backdrop-blur-xs transition-all hover:border-[#F85606] hover:text-[#F85606] sm:flex"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
