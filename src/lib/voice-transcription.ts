export type VoiceLanguage = "eng" | "lug";

// Netlify buffers binary function requests as base64, so stay safely below its
// effective request ceiling after multipart and encoding overhead are added.
export const MAX_VOICE_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MIN_VOICE_UPLOAD_BYTES = 512;

const supportedAudioTypes = new Set([
  "audio/aac",
  "audio/flac",
  "audio/m4a",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
  "audio/x-wav",
]);

export function validateVoiceUpload(input: { size: number; type: string; language: string }) {
  if (input.language !== "eng" && input.language !== "lug") return "Choose English or Luganda before recording.";
  if (!Number.isFinite(input.size) || input.size < MIN_VOICE_UPLOAD_BYTES) return "The recording was too short. Speak for a moment and try again.";
  if (input.size > MAX_VOICE_UPLOAD_BYTES) return "The recording is too large. Keep it under 30 seconds and try again.";
  const mediaType = input.type.toLowerCase().split(";", 1)[0].trim();
  if (!supportedAudioTypes.has(mediaType)) return "This audio format is not supported. Try recording again in this browser.";
  return null;
}

export function extractVoiceTranscript(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const transcript = (value as Record<string, unknown>).audio_transcription;
  if (typeof transcript !== "string") return null;
  const normalized = transcript.replace(/\s+/g, " ").trim();
  return normalized || null;
}
