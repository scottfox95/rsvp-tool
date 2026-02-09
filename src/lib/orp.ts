/**
 * Optimal Recognition Point (ORP) calculator.
 *
 * The ORP is the letter position where the eye naturally fixates
 * for instant word recognition — slightly left of center (~30%).
 * Highlighting this letter in red anchors the reader's gaze to a
 * fixed point in space, eliminating saccadic eye movement.
 */

export interface ORPResult {
  prefix: string;
  orp: string;
  suffix: string;
  orpIndex: number;
}

/**
 * Returns the string index of the ORP letter in the original word.
 * Accounts for punctuation — only counts letter/digit characters
 * for the length calculation, then maps back to the original string.
 */
export function getORPIndex(word: string): number {
  const letterPositions: number[] = [];
  for (let i = 0; i < word.length; i++) {
    if (/[a-zA-Z0-9']/.test(word[i])) {
      letterPositions.push(i);
    }
  }

  const len = letterPositions.length;
  if (len <= 0) return 0;
  if (len <= 1) return letterPositions[0];
  if (len <= 5) return letterPositions[1];
  if (len <= 9) return letterPositions[2];
  if (len <= 13) return letterPositions[3];
  return letterPositions[4];
}

/**
 * Split a word into prefix, ORP letter, and suffix.
 */
export function splitAtORP(word: string): ORPResult {
  const orpIndex = getORPIndex(word);
  return {
    prefix: word.substring(0, orpIndex),
    orp: word[orpIndex] || "",
    suffix: word.substring(orpIndex + 1),
    orpIndex,
  };
}

/**
 * Parse text into an array of words, filtering out empty strings.
 */
export function parseWords(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

/**
 * Calculate delay in ms for a given WPM.
 * Adds extra pause for words ending in sentence-ending punctuation.
 */
export function getWordDelay(word: string, wpm: number): number {
  const baseDelay = 60000 / wpm;

  // Extra pause at sentence boundaries
  if (/[.!?]$/.test(word)) return baseDelay * 2.2;
  // Slight pause at clause boundaries
  if (/[,;:]$/.test(word)) return baseDelay * 1.4;

  return baseDelay;
}
