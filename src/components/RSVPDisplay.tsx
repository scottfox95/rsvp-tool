"use client";

import { splitAtORP } from "@/lib/orp";

interface RSVPDisplayProps {
  word: string;
  showGuideLines?: boolean;
}

/**
 * The hero element — renders a single word with the ORP letter
 * highlighted in red. Uses absolute positioning with `ch` units
 * to mathematically guarantee the ORP letter sits at the exact
 * horizontal center, regardless of word length.
 */
export function RSVPDisplay({ word, showGuideLines = true }: RSVPDisplayProps) {
  const { prefix, orp, suffix, orpIndex } = splitAtORP(word);

  return (
    <div className="relative flex flex-col items-center w-full select-none">
      {/* Top guide: tick + line */}
      {showGuideLines && (
        <div className="relative w-full h-[14px] mb-2">
          <div className="absolute left-1/2 bottom-0 w-[2px] h-[12px] bg-[var(--guide-tick)] -translate-x-1/2" />
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--guide)]" />
        </div>
      )}

      {/* Word display — absolute positioned so ORP char is always at center */}
      <div
        className="word-snap relative w-full overflow-hidden"
        style={{
          fontSize: "clamp(2.5rem, 8vw, 5rem)",
          height: "1.3em",
        }}
      >
        <div
          className="absolute whitespace-nowrap font-mono font-bold tracking-tight"
          style={{
            left: "50%",
            top: "50%",
            /* Shift left by (orpIndex + 0.5) characters so ORP center = 50% */
            transform: `translate(calc(-${orpIndex + 0.5} * 1ch), -50%)`,
          }}
        >
          <span className="text-white">{prefix}</span>
          <span
            style={{
              color: "var(--red)",
              textShadow: "0 0 30px var(--red-glow), 0 0 60px var(--red-glow)",
            }}
          >
            {orp}
          </span>
          <span className="text-white">{suffix}</span>
        </div>
      </div>

      {/* Bottom guide: line + tick */}
      {showGuideLines && (
        <div className="relative w-full h-[14px] mt-2">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--guide)]" />
          <div className="absolute left-1/2 top-0 w-[2px] h-[12px] bg-[var(--guide-tick)] -translate-x-1/2" />
        </div>
      )}
    </div>
  );
}
