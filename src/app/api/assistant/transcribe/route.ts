import { NextResponse } from "next/server";
import {
  extractVoiceTranscript,
  validateVoiceUpload,
  VoiceLanguage,
} from "@/lib/voice-transcription";

export const runtime = "nodejs";

const SUNBIRD_TRANSCRIPTION_URL = "https://api.sunbird.ai/tasks/audio/transcriptions";
const requestWindows = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 8;
const RATE_WINDOW_MS = 60_000;
const MAX_RATE_KEYS = 500;

function resolveClientId(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return request.headers.get("cf-connecting-ip")
    || request.headers.get("x-real-ip")
    || forwardedFor?.split(",")[0]?.trim()
    || "unknown";
}
function consumeRateLimit(request: Request) {
  const now = Date.now();
  for (const [key, value] of requestWindows) if (value.resetAt <= now) requestWindows.delete(key);
  const clientId = resolveClientId(request);
  const current = requestWindows.get(clientId);
  if (!current) {
    if (requestWindows.size >= MAX_RATE_KEYS) return false;
    requestWindows.set(clientId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (current.count >= RATE_LIMIT) return false;
  current.count += 1;
  return true;
}

function safeAudioName(file: File) {
  const extension = file.type.includes("ogg") ? "ogg"
    : file.type.includes("mp4") || file.type.includes("m4a") ? "m4a"
      : file.type.includes("mpeg") ? "mp3"
        : file.type.includes("wav") ? "wav"
          : "webm";
  return `tunda-recording.${extension}`;
}

export async function POST(request: Request) {
  if (!consumeRateLimit(request)) return NextResponse.json({ error: "Voice is busy. Wait a moment and try again." }, { status: 429 });

  const token = process.env.SUNBIRD_API_TOKEN;
  if (!token) {
    console.error("Voice transcription is not configured: SUNBIRD_API_TOKEN is missing.");
    return NextResponse.json({ error: "Voice is not available right now. You can type the transaction instead." }, { status: 503 });
  }

  try {
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
      return NextResponse.json({ error: "Send the recording as an audio file." }, { status: 415 });
    }
    const formData = await request.formData();
    const audio = formData.get("audio");
    const language = String(formData.get("language") ?? "") as VoiceLanguage;
    if (!(audio instanceof File)) return NextResponse.json({ error: "Record something first." }, { status: 400 });
    const validationError = validateVoiceUpload({ size: audio.size, type: audio.type, language });
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const upstreamForm = new FormData();
    upstreamForm.append("audio", audio, safeAudioName(audio));
    upstreamForm.append("language", language);

    const response = await fetch(SUNBIRD_TRANSCRIPTION_URL, {
      method: "POST",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      body: upstreamForm,
      signal: AbortSignal.timeout(25_000),
    });
    const payload = await response.json().catch(() => null) as unknown;
    if (!response.ok) {
      console.warn("Voice transcription provider request failed.", { status: response.status });
      if (response.status === 429) return NextResponse.json({ error: "Voice is busy. Wait a moment and try again." }, { status: 429 });
      if (response.status === 401 || response.status === 403) return NextResponse.json({ error: "Voice is not available right now. You can type the transaction instead." }, { status: 503 });
      return NextResponse.json({ error: "I could not hear that clearly. Try again or type the transaction." }, { status: 422 });
    }

    const text = extractVoiceTranscript(payload);
    if (!text) return NextResponse.json({ error: "I could not hear any words. Try again or type the transaction." }, { status: 422 });
    return NextResponse.json({ text, language });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    console.warn("Voice transcription request could not complete.", { timedOut });
    return NextResponse.json({ error: timedOut ? "Voice took too long. Try a shorter recording." : "Voice is unavailable right now. You can type the transaction instead." }, { status: 503 });
  }
}
