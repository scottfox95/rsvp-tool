"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RSVPDisplay } from "./RSVPDisplay";
import { TextMap } from "./TextMap";
import { parseWords, getWordDelay } from "@/lib/orp";

interface RSVPReaderProps {
  text: string;
  onExit: () => void;
}

export function RSVPReader({ text, onExit }: RSVPReaderProps) {
  const words = useRef(parseWords(text));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(300);
  const [hasStarted, setHasStarted] = useState(false);
  const [showTextMap, setShowTextMap] = useState(true);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Touch handling
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const totalWords = words.current.length;
  const currentWord = words.current[currentIndex] || "";
  const progress = totalWords > 0 ? ((currentIndex + 1) / totalWords) * 100 : 0;
  const isFinished = currentIndex >= totalWords - 1 && !isPlaying;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleNext = useCallback(() => {
    clearTimer();
    const word = words.current[currentIndex];
    if (!word) return;

    const delay = getWordDelay(word, wpm);
    timerRef.current = setTimeout(() => {
      setCurrentIndex((prev) => {
        if (prev >= totalWords - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, delay);
  }, [currentIndex, wpm, totalWords, clearTimer]);

  // Playback engine
  useEffect(() => {
    if (isPlaying && currentIndex < totalWords) {
      scheduleNext();
    }
    return clearTimer;
  }, [isPlaying, currentIndex, scheduleNext, totalWords, clearTimer]);

  const togglePlay = useCallback(() => {
    if (!hasStarted) setHasStarted(true);
    if (isFinished) {
      setCurrentIndex(0);
      setIsPlaying(true);
      return;
    }
    setIsPlaying((p) => !p);
  }, [hasStarted, isFinished]);

  const skipWord = useCallback(
    (direction: number) => {
      if (!hasStarted) setHasStarted(true);
      clearTimer();
      setCurrentIndex((prev) => {
        const next = prev + direction;
        return Math.max(0, Math.min(next, totalWords - 1));
      });
    },
    [totalWords, clearTimer, hasStarted]
  );

  const skipSentence = useCallback(
    (direction: number) => {
      if (!hasStarted) setHasStarted(true);
      clearTimer();
      setCurrentIndex((prev) => {
        let idx = prev;
        if (direction > 0) {
          // Find next sentence-ending punctuation
          while (idx < totalWords - 1) {
            idx++;
            if (/[.!?]$/.test(words.current[idx])) {
              idx = Math.min(idx + 1, totalWords - 1);
              break;
            }
          }
        } else {
          // Find previous sentence start
          idx = Math.max(0, idx - 1);
          while (idx > 0) {
            idx--;
            if (/[.!?]$/.test(words.current[idx])) {
              idx++;
              break;
            }
          }
        }
        return idx;
      });
    },
    [totalWords, clearTimer, hasStarted]
  );

  const adjustWpm = useCallback((delta: number) => {
    setWpm((prev) => Math.max(100, Math.min(1000, prev + delta)));
  }, []);

  const restart = useCallback(() => {
    clearTimer();
    setCurrentIndex(0);
    setIsPlaying(false);
    setHasStarted(false);
  }, [clearTimer]);

  const seekTo = useCallback(
    (index: number) => {
      if (!hasStarted) setHasStarted(true);
      clearTimer();
      setCurrentIndex(Math.max(0, Math.min(index, totalWords - 1)));
    },
    [totalWords, clearTimer, hasStarted]
  );

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (e.shiftKey) skipSentence(-1);
          else skipWord(-1);
          break;
        case "ArrowRight":
          e.preventDefault();
          if (e.shiftKey) skipSentence(1);
          else skipWord(1);
          break;
        case "ArrowUp":
          e.preventDefault();
          adjustWpm(25);
          break;
        case "ArrowDown":
          e.preventDefault();
          adjustWpm(-25);
          break;
        case "r":
          restart();
          break;
        case "Escape":
          onExit();
          break;
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [togglePlay, skipWord, skipSentence, adjustWpm, restart, onExit]);

  // Touch: tap center = play/pause, swipe = skip
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;

      // Don't handle touches on interactive elements — let their onClick fire
      const target = e.target as HTMLElement;
      if (target.closest("button, input, [data-word-index]")) {
        touchStartRef.current = null;
        return;
      }

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const dt = Date.now() - touchStartRef.current.time;
      touchStartRef.current = null;

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Swipe detection
      if (absDx > 40 && absDx > absDy && dt < 500) {
        if (dx > 0) skipWord(-1);
        else skipWord(1);
        return;
      }

      // Tap detection (small movement, quick)
      if (absDx < 15 && absDy < 15 && dt < 300) {
        togglePlay();
      }
    },
    [togglePlay, skipWord]
  );

  // Estimated time remaining
  const wordsLeft = totalWords - currentIndex - 1;
  const etaSeconds = Math.ceil((wordsLeft / wpm) * 60);
  const etaDisplay =
    etaSeconds >= 60
      ? `${Math.floor(etaSeconds / 60)}m ${etaSeconds % 60}s`
      : `${etaSeconds}s`;

  return (
    <div
      ref={containerRef}
      className="fade-enter flex flex-col h-full w-full"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar: exit + WPM + stats */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 sm:px-6">
        <button
          onClick={onExit}
          className="text-[var(--muted)] hover:text-white transition-colors text-sm font-sans flex items-center gap-1.5"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>

        <div className="flex items-center gap-4">
          <span className="text-[var(--dim)] text-xs font-mono tabular-nums">
            {currentIndex + 1}/{totalWords}
          </span>
          <span className="text-[var(--dim)] text-xs font-mono">
            ~{etaDisplay} left
          </span>
        </div>
      </div>

      {/* RSVP Display — the hero */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-12">
        <div className="w-full max-w-2xl">
          {!hasStarted ? (
            <button
              onClick={togglePlay}
              className="w-full flex flex-col items-center gap-6 group cursor-pointer"
            >
              <div className="relative flex flex-col items-center w-full">
                <RSVPDisplay word={currentWord} />
              </div>
              <div className="flex items-center gap-2 text-[var(--muted)] group-hover:text-white transition-colors">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <polygon points="6,4 16,10 6,16" />
                </svg>
                <span className="text-sm font-sans">Tap to start</span>
              </div>
            </button>
          ) : (
            <RSVPDisplay key={currentIndex} word={currentWord} />
          )}
        </div>
      </div>

      {/* Text map — ghostly full-text view */}
      {hasStarted && showTextMap && (
        <TextMap
          words={words.current}
          currentIndex={currentIndex}
          onSeek={seekTo}
        />
      )}
      {hasStarted && !showTextMap && <div className="h-2" />}

      {/* Controls */}
      <div className="px-4 pb-6 sm:px-6 space-y-4">
        {/* Progress bar — draggable range input */}
        <div className="relative">
          <input
            type="range"
            min={0}
            max={totalWords - 1}
            step={1}
            value={currentIndex}
            onChange={(e) => seekTo(Number(e.target.value))}
            className="progress-slider w-full"
          />
        </div>

        {/* Play controls */}
        <div className="flex items-center justify-center gap-3">
          {/* Skip back sentence */}
          <button
            onClick={() => skipSentence(-1)}
            className="w-10 h-10 flex items-center justify-center text-[rgba(255,255,255,0.5)] hover:text-white transition-colors rounded-full hover:bg-[var(--surface-hover)]"
            title="Previous sentence (Shift+Left)"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <rect x="2" y="4" width="2" height="10" rx="1" />
              <polygon points="14,4 6,9 14,14" />
            </svg>
          </button>

          {/* Skip back word */}
          <button
            onClick={() => skipWord(-1)}
            className="w-10 h-10 flex items-center justify-center text-[rgba(255,255,255,0.5)] hover:text-white transition-colors rounded-full hover:bg-[var(--surface-hover)]"
            title="Previous word (Left arrow)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <polygon points="12,3 5,8 12,13" />
            </svg>
          </button>

          {/* Play/Pause — big thumb target */}
          <button
            onClick={togglePlay}
            className="w-14 h-14 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer"
            style={{
              background: isPlaying ? "var(--surface-hover)" : "var(--red)",
              boxShadow: isPlaying ? "none" : "0 0 24px var(--red-glow), 0 0 48px var(--red-glow)",
            }}
            title="Play/Pause (Space)"
          >
            {isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
                <rect x="5" y="4" width="3.5" height="12" rx="1" />
                <rect x="11.5" y="4" width="3.5" height="12" rx="1" />
              </svg>
            ) : isFinished ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
                <path d="M4 3.5L4 16.5M7.5 10L16 4V16L7.5 10Z" stroke="white" strokeWidth="2" fill="white" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
                <polygon points="7,4 17,10 7,16" />
              </svg>
            )}
          </button>

          {/* Skip forward word */}
          <button
            onClick={() => skipWord(1)}
            className="w-10 h-10 flex items-center justify-center text-[rgba(255,255,255,0.5)] hover:text-white transition-colors rounded-full hover:bg-[var(--surface-hover)]"
            title="Next word (Right arrow)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <polygon points="4,3 11,8 4,13" />
            </svg>
          </button>

          {/* Skip forward sentence */}
          <button
            onClick={() => skipSentence(1)}
            className="w-10 h-10 flex items-center justify-center text-[rgba(255,255,255,0.5)] hover:text-white transition-colors rounded-full hover:bg-[var(--surface-hover)]"
            title="Next sentence (Shift+Right)"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <polygon points="4,4 12,9 4,14" />
              <rect x="14" y="4" width="2" height="10" rx="1" />
            </svg>
          </button>
        </div>

        {/* WPM slider */}
        <div className="flex items-center gap-4 px-2">
          <span className="text-[var(--dim)] text-xs font-sans w-8 shrink-0">WPM</span>
          <input
            type="range"
            min={100}
            max={1000}
            step={25}
            value={wpm}
            onChange={(e) => setWpm(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-white text-sm font-mono tabular-nums w-10 text-right shrink-0">
            {wpm}
          </span>
        </div>

        {/* Restart + Toggle text */}
        <div className="flex justify-center gap-6">
          <button
            onClick={restart}
            className="text-[var(--dim)] hover:text-white transition-colors text-xs font-sans flex items-center gap-1.5"
            title="Restart (R)"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 7a6 6 0 1 1 1.5 3.9" strokeLinecap="round" />
              <path d="M1 11V7h4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Restart
          </button>
          <button
            onClick={() => setShowTextMap((v) => !v)}
            className="text-[var(--dim)] hover:text-white transition-colors text-xs font-sans flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              {showTextMap ? (
                <>
                  <path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="7" cy="7" r="1.5" />
                </>
              ) : (
                <>
                  <path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 12L12 2" strokeLinecap="round" />
                </>
              )}
            </svg>
            {showTextMap ? "Hide text" : "Show text"}
          </button>
        </div>
      </div>
    </div>
  );
}
