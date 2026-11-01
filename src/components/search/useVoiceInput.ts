"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/*
  Speech to text through the browser's own recogniser: free, no new service, and
  the words appear as they're spoken. The audio is handled by the browser's
  vendor (Google in Chrome, Apple in Safari), not by us.

  Not in TypeScript's DOM types yet, so the little we use is declared here.
*/
interface RecognitionResult {
  0: { transcript: string };
}

interface RecognitionEvent {
  results: ArrayLike<RecognitionResult>;
}

interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type RecognitionConstructor = new () => Recognition;

function getRecognition(): RecognitionConstructor | undefined {
  const w = window as unknown as Record<string, RecognitionConstructor | undefined>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** Stop once they've paused, or if they never start: Safari keeps listening otherwise. */
const SILENCE_AFTER_SPEECH_MS = 3000;
const SILENCE_BEFORE_SPEECH_MS = 7000;
/** Safari can miss its end event after a stop; don't leave them waiting on it. */
const STOP_GRACE_MS = 1500;

// Indian languages the browser's recognisers offer, to honour a phone set to one.
const INDIAN_LANGUAGES = ["hi", "bn", "gu", "kn", "ml", "mr", "pa", "ta", "te", "ur"];

/** en-IN by default: it knows Indian names and places that en-US mangles. */
function speechLanguage(): string {
  const preferred = navigator.language;
  return INDIAN_LANGUAGES.includes(preferred.split("-")[0]) ? preferred : "en-IN";
}

/** Chrome on Android repeats everything so far in each new result, where other
 *  browsers send only the new words, so a result that extends the text replaces it. */
function joinResults(results: ArrayLike<RecognitionResult>): string {
  return Array.from(results, (result) => result[0].transcript).reduce((all, next) => {
    const extendsAll =
      next.trim().length > all.trim().length &&
      next.trim().toLowerCase().startsWith(all.trim().toLowerCase());
    return extendsAll ? next : all + next;
  }, "");
}

function errorMessage(error: string): string | null {
  switch (error) {
    case "aborted":
      return null;
    case "no-speech":
      return "Didn't catch that. Tap the mic and try again.";
    case "not-allowed":
      return "Microphone is blocked. Allow it for this site in your browser settings, or type instead.";
    case "audio-capture":
      return "No microphone found. Type your search instead.";
    default:
      // "network", or "service-not-allowed" in apps with a built-in browser.
      return "Voice search isn't working here. Type your search instead.";
  }
}

/**
 * Holds what's been heard so far in `transcript`; the search only hears about
 * it once, through `onFinished`, when they've finished speaking. Half-said
 * sentences would otherwise each trigger a meaning check and fresh suggestions.
 */
export function useVoiceInput(onFinished: (text: string) => void) {
  const supported = useSyncExternalStore(
    () => () => {},
    () => getRecognition() !== undefined,
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<Recognition | null>(null);
  const wrapUpRef = useRef<() => void>(() => {});
  const silenceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  const cancel = useCallback(() => {
    clearTimeout(silenceRef.current);
    const recognition = recognitionRef.current;
    // Cleared first: the handlers below ignore a recognition that's no longer current.
    recognitionRef.current = null;
    recognition?.abort();
    setListening(false);
  }, []);

  useEffect(() => cancel, [cancel]);

  const stop = useCallback(() => wrapUpRef.current(), []);

  const start = useCallback(() => {
    const Constructor = getRecognition();
    if (!Constructor || recognitionRef.current) return;

    const recognition = new Constructor();
    recognition.lang = speechLanguage();
    recognition.interimResults = true;
    recognition.continuous = true;

    // Words from before a restart (see onend); `text` is everything so far.
    let earlier = "";
    let text = "";
    let stopping = false;
    const isCurrent = () => recognitionRef.current === recognition;

    const finish = () => {
      if (!isCurrent()) return;
      clearTimeout(silenceRef.current);
      recognitionRef.current = null;
      recognition.abort();
      setListening(false);
      if (text.trim()) onFinishedRef.current(text.trim());
      else setError((shown) => shown ?? errorMessage("no-speech"));
    };
    const wrapUp = () => {
      stopping = true;
      clearTimeout(silenceRef.current);
      silenceRef.current = setTimeout(finish, STOP_GRACE_MS);
      recognition.stop();
    };
    const stopAfter = (ms: number) => {
      clearTimeout(silenceRef.current);
      silenceRef.current = setTimeout(wrapUp, ms);
    };

    recognition.onresult = (event) => {
      if (!isCurrent()) return;
      text = earlier + joinResults(event.results);
      setTranscript(text);
      if (!stopping) stopAfter(SILENCE_AFTER_SPEECH_MS);
    };
    recognition.onerror = (event) => {
      if (!isCurrent()) return;
      // With words already heard a late hiccup costs nothing; onend sends them.
      if (text) return;
      setError(errorMessage(event.error));
      finish();
    };
    recognition.onend = () => {
      if (!isCurrent()) return;
      if (stopping || !text.trim()) return finish();
      // Some phones end at a pause even when asked to keep listening. They
      // decide when it's over, not the browser, so pick up where it left off.
      earlier = `${text.trim()} `;
      try {
        recognition.start();
      } catch {
        finish();
      }
    };

    setTranscript("");
    setError(null);
    recognitionRef.current = recognition;
    wrapUpRef.current = wrapUp;
    try {
      recognition.start();
      setListening(true);
      stopAfter(SILENCE_BEFORE_SPEECH_MS);
    } catch {
      recognitionRef.current = null;
      setError(errorMessage("unavailable"));
    }
  }, []);

  return { supported, listening, transcript, error, start, stop, cancel };
}
