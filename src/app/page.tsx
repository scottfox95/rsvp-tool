"use client";

import { useState, useCallback } from "react";
import { TextInput } from "@/components/TextInput";
import { RSVPReader } from "@/components/RSVPReader";

export default function Home() {
  const [text, setText] = useState<string | null>(null);

  const handleSubmit = useCallback((t: string) => {
    setText(t);
  }, []);

  const handleExit = useCallback(() => {
    setText(null);
  }, []);

  return (
    <main className="h-dvh w-full max-w-2xl mx-auto">
      {text ? (
        <RSVPReader text={text} onExit={handleExit} />
      ) : (
        <TextInput onSubmit={handleSubmit} />
      )}
    </main>
  );
}
