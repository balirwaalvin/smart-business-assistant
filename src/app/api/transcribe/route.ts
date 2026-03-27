import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireUserId } from '@/lib/auth';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

function normalizeText(input: string): string {
  return String(input || '').replace(/\s+/g, ' ').trim();
}

async function transcribeWithDeepgram(audio: File) {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPGRAM_API_KEY is missing');
  }

  const audioBuffer = await audio.arrayBuffer();
  const contentType = audio.type || 'audio/webm';

  const response = await fetch(
    'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&detect_language=true',
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': contentType,
      },
      body: audioBuffer,
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Deepgram transcription failed: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
  return normalizeText(typeof transcript === 'string' ? transcript : '');
}

async function transcribeWithOpenAI(audio: File, lang: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing');
  }

  const transcription = await client.audio.transcriptions.create({
    file: audio,
    model: 'gpt-4o-mini-transcribe',
    language: lang === 'luganda' ? 'en' : 'en',
    prompt: 'Transcribe Ugandan English and possible Luganda business transaction speech. Return plain text only.',
  });

  const text = typeof transcription === 'string'
    ? transcription
    : typeof transcription?.text === 'string'
      ? transcription.text
      : '';

  return normalizeText(text);
}

export async function GET() {
  return NextResponse.json({
    enabled: Boolean(process.env.DEEPGRAM_API_KEY || process.env.OPENAI_API_KEY),
    provider: process.env.DEEPGRAM_API_KEY ? 'deepgram' : process.env.OPENAI_API_KEY ? 'openai' : null,
  });
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasDeepgram = Boolean(process.env.DEEPGRAM_API_KEY);
    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

    if (!hasDeepgram && !hasOpenAI) {
      return NextResponse.json(
        { error: 'No transcription provider configured. Add DEEPGRAM_API_KEY (preferred) or OPENAI_API_KEY.' },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const audio = formData.get('audio');
    const lang = String(formData.get('lang') || 'english').toLowerCase();

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: 'Audio file is required.' }, { status: 400 });
    }

    if (audio.size <= 0) {
      return NextResponse.json({ error: 'Audio file is empty.' }, { status: 400 });
    }

    let normalizedText = '';

    if (hasDeepgram) {
      normalizedText = await transcribeWithDeepgram(audio);
    } else {
      normalizedText = await transcribeWithOpenAI(audio, lang);
    }

    if (!normalizedText) {
      return NextResponse.json({ error: 'No speech recognized from audio.' }, { status: 422 });
    }

    return NextResponse.json({ text: normalizedText });
  } catch (error) {
    console.error('Transcription API error:', error);
    const message = error instanceof Error ? error.message : 'Transcription failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
