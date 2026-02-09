"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface TextMapProps {
  words: string[];
  currentIndex: number;
  onSeek: (index: number) => void;
}

/**
 * A ghostly view of the full text at the bottom of the reader.
 * Collapsed: fog with a flashlight glow around the current word.
 * Expanded: full readable text, click a word to jump there.
 */
export function TextMap({ words, currentIndex, onSeek }: TextMapProps) {
  const [expanded, setExpanded] = useState(false);
  const currentRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to keep current word in view
  useEffect(() => {
    if (currentRef.current && containerRef.current) {
      const container = containerRef.current;
      const word = currentRef.current;
      const containerRect = container.getBoundingClientRect();
      const wordRect = word.getBoundingClientRect();

      const wordCenter = wordRect.top + wordRect.height / 2;
      const containerCenter = containerRect.top + containerRect.height / 2;
      const offset = wordCenter - containerCenter;

      container.scrollBy({
        top: offset,
        behavior: "smooth",
      });
    }
  }, [currentIndex, expanded]);

  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      // If collapsed, expand. If expanded, check if a word was clicked.
      if (!expanded) {
        setExpanded(true);
        return;
      }
      // Clicking the backdrop (not a word) collapses
      if ((e.target as HTMLElement).dataset.wordIndex === undefined) {
        setExpanded(false);
      }
    },
    [expanded]
  );

  const handleWordClick = useCallback(
    (index: number) => {
      if (expanded) {
        onSeek(index);
        setExpanded(false);
      }
    },
    [expanded, onSeek]
  );

  const GLOW_RADIUS = 6;

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="overflow-hidden font-sans px-4 sm:px-6 select-none cursor-pointer transition-all duration-300 ease-out"
        onClick={handleContainerClick}
        style={{
          maxHeight: expanded ? "40vh" : "72px",
          overflowY: expanded ? "auto" : "hidden",
          fontSize: expanded ? "13px" : "11px",
          lineHeight: expanded ? "1.8" : "1.6",
          maskImage: expanded
            ? "linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%)"
            : "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
          WebkitMaskImage: expanded
            ? "linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%)"
            : "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
        }}
      >
        <div className="text-center py-4">
          {words.map((word, i) => {
            const distance = Math.abs(i - currentIndex);
            const isCurrent = i === currentIndex;
            const isNear = distance <= GLOW_RADIUS;

            let opacity: number;
            if (expanded) {
              opacity = 0.5;
            } else if (isNear) {
              const t = 1 - distance / GLOW_RADIUS;
              opacity = 0.07 + t * 0.38;
            } else {
              opacity = 0.07;
            }

            return (
              <span
                key={i}
                ref={isCurrent ? currentRef : undefined}
                data-word-index={i}
                className="transition-opacity duration-150"
                style={{
                  opacity,
                  color: "white",
                  cursor: expanded ? "pointer" : "default",
                }}
                onClick={(e) => {
                  if (expanded) {
                    e.stopPropagation();
                    handleWordClick(i);
                  }
                }}
              >
                {word}{" "}
              </span>
            );
          })}
        </div>
      </div>

      {/* Expand hint */}
      {!expanded && (
        <div className="flex justify-center mt-1">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="text-[var(--dim)] opacity-60"
          >
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
