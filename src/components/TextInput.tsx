"use client";

import { useState, useRef, useCallback } from "react";

interface TextInputProps {
  onSubmit: (text: string) => void;
}

export function TextInput({ onSubmit }: TextInputProps) {
  const [text, setText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed.length > 0) {
      onSubmit(trimmed);
    }
  }, [text, onSubmit]);

  const processImage = useCallback(
    async (file: File) => {
      setIsProcessingImage(true);
      setOcrError("");

      try {
        const formData = new FormData();
        formData.append("image", file);

        const res = await fetch("/api/ocr", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "OCR failed");
        }

        const data = await res.json();
        if (data.text) {
          setText((prev) => (prev ? prev + "\n\n" + data.text : data.text));
        }
      } catch (err) {
        setOcrError(err instanceof Error ? err.message : "Failed to extract text");
      } finally {
        setIsProcessingImage(false);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        processImage(file);
      }
    },
    [processImage]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processImage(file);
    },
    [processImage]
  );

  const wordCount = text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  return (
    <div className="fade-enter flex flex-col h-full px-4 sm:px-6 pt-4 pb-6">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-mono text-[var(--muted)] text-[10px] tracking-[0.2em] uppercase mb-1">
            Ryan & Scott&apos;s
          </h1>
          <h2 className="font-mono text-white text-lg tracking-tight">
            RSVP <span className="text-[var(--red)]">Reader</span>
          </h2>
        </div>
        {wordCount > 0 && (
          <span className="text-[var(--dim)] text-xs font-mono tabular-nums">
            {wordCount} word{wordCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Text input area */}
      <div
        className={`flex-1 relative rounded-xl border transition-colors duration-200 ${
          isDragging
            ? "drag-over border-[var(--red)]"
            : "border-[var(--surface-border)] bg-[var(--surface)]"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOcrError("");
          }}
          placeholder="Paste your text here..."
          className="w-full h-full resize-none bg-transparent text-white text-base leading-relaxed p-4 rounded-xl font-sans placeholder:text-[var(--dim)]"
          autoFocus
        />

        {/* Drop overlay */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl pointer-events-none">
            <div className="flex flex-col items-center gap-2">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="var(--red)" strokeWidth="2">
                <rect x="6" y="6" width="20" height="20" rx="4" />
                <circle cx="13" cy="14" r="2" />
                <path d="M6 22l6-6 4 4 4-4 6 6" strokeLinejoin="round" />
              </svg>
              <span className="text-[var(--red)] text-sm font-sans">Drop image to extract text</span>
            </div>
          </div>
        )}

        {/* Processing overlay */}
        {isProcessingImage && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-[var(--red)] border-t-transparent rounded-full animate-spin" />
              <span className="text-white text-sm font-sans">Extracting text...</span>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {ocrError && (
        <p className="text-[var(--red)] text-xs font-sans mt-2 px-1">{ocrError}</p>
      )}

      {/* Bottom actions */}
      <div className="flex items-center gap-3 mt-4">
        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessingImage}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors text-[var(--muted)] hover:text-white text-sm font-sans disabled:opacity-40 cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="2" width="12" height="12" rx="2" />
            <circle cx="5.5" cy="5.5" r="1.5" />
            <path d="M2 12l3.5-3.5 2.5 2.5 2.5-2.5L14 12" strokeLinejoin="round" />
          </svg>
          Screenshot
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Start reading */}
        <button
          onClick={handleSubmit}
          disabled={wordCount === 0}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-sans text-sm font-medium transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
          style={{
            background: wordCount > 0 ? "var(--red)" : "var(--surface)",
            color: "white",
            boxShadow: wordCount > 0 ? "0 0 24px var(--red-glow), 0 0 48px var(--red-glow)" : "none",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
            <polygon points="5,3 13,8 5,13" />
          </svg>
          Read
        </button>
      </div>

      {/* Keyboard hint (desktop only) */}
      <div className="hidden sm:flex items-center justify-center gap-4 mt-4 text-[var(--dim)] text-[10px] font-mono">
        <span>Space: play/pause</span>
        <span className="text-[var(--surface-border)]">|</span>
        <span>Arrows: navigate</span>
        <span className="text-[var(--surface-border)]">|</span>
        <span>Esc: back</span>
      </div>
    </div>
  );
}
