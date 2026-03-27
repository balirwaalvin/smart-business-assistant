'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Mic, MicOff, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { useLang } from '@/contexts/LangContext';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface ClassificationResult {
  type: 'cashSale' | 'creditSale' | 'cashPurchase' | 'creditPurchase' | 'expense' | 'drawing' | null;
  product?: string;
  quantity?: number;
  amount?: number;
  customer?: string;
  payment_type?: 'cash' | 'credit';
  confidence?: number;
  explanation?: string;
}

function mapClassificationToApiPayload(classification: ClassificationResult) {
  const mappedType =
    classification.type === 'cashSale' || classification.type === 'creditSale'
      ? 'sale'
      : classification.type === 'cashPurchase' || classification.type === 'creditPurchase'
        ? 'purchase'
        : classification.type === 'drawing'
          ? 'drawing'
          : 'expense';

  const mappedPaymentType =
    classification.type === 'creditSale' || classification.type === 'creditPurchase'
      ? 'credit'
      : 'cash';

  return {
    type: mappedType,
    payment_type: classification.payment_type || mappedPaymentType,
  };
}

export default function IntelligentTransactionEntry({ onTransactionAdded }: { onTransactionAdded: () => void }) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speechPreview, setSpeechPreview] = useState('');
  const [hasMediaRecorderSupport, setHasMediaRecorderSupport] = useState(true);
  const [hasBrowserSpeechSupport, setHasBrowserSpeechSupport] = useState(false);
  const [hasServerTranscription, setHasServerTranscription] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const browserRecognitionRef = useRef<any>(null);
  const listeningModeRef = useRef<'server' | 'browser' | null>(null);
  const { t, isLuganda } = useLang();

  const normalizeTranscript = (input: string) => input.replace(/\s+/g, ' ').trim();

  const typeLabels: Record<string, string> = {
    cashSale: isLuganda ? 'Entunda (Cash)' : 'Sale (Cash)',
    creditSale: isLuganda ? 'Entunda (Credit)' : 'Sale (Credit)',
    cashPurchase: isLuganda ? 'Ebiguliddwa (Cash)' : 'Purchase (Cash)',
    creditPurchase: isLuganda ? 'Ebiguliddwa (Credit)' : 'Purchase (Credit)',
    expense: isLuganda ? 'Ensaasaanya' : 'Expense',
    drawing: isLuganda ? 'Okukwata' : 'Drawing',
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const canRecord = Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';
    setHasMediaRecorderSupport(canRecord);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const hasBrowserRecognition = Boolean(SpeechRecognition);
    setHasBrowserSpeechSupport(hasBrowserRecognition);

    if (hasBrowserRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-UG';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const segment = event.results[i][0]?.transcript ?? '';
          if (event.results[i].isFinal) {
            finalTranscript += ` ${segment}`;
          } else {
            interimTranscript += ` ${segment}`;
          }
        }

        const combinedTranscript = normalizeTranscript(`${finalTranscript} ${interimTranscript}`);
        if (!combinedTranscript) return;
        setSpeechPreview(combinedTranscript);
        setText(combinedTranscript);
      };

      recognition.onerror = () => {
        setSpeechError(
          isLuganda
            ? 'Browser speech recognition elemedde. Gezaako nate oba wandiike butereevu.'
            : 'Browser speech recognition failed. Please try again or type directly.'
        );
        setIsListening(false);
      };

      recognition.onend = () => {
        if (listeningModeRef.current === 'browser') {
          setIsListening(false);
          listeningModeRef.current = null;
        }
      };

      browserRecognitionRef.current = recognition;
    }

    fetch('/api/transcribe')
      .then(async (res) => {
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        setHasServerTranscription(Boolean(data?.enabled));
      })
      .catch(() => {
        // Keep current mode; actual POST response determines fallback decisively.
      });

    return () => {
      mediaRecorderRef.current?.stop();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      try {
        browserRecognitionRef.current?.stop();
      } catch {
        // no-op
      }
    };
  }, [isLuganda]);

  const analyzeTransactionText = async (inputText: string) => {
    const normalizedInput = normalizeTranscript(inputText);
    if (!normalizedInput) return;

    setIsAnalyzing(true);
    setErrorMessage(null);
    setClassification(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/transactions/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: normalizedInput, lang: isLuganda ? 'luganda' : 'english' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to analyze transaction');
        return;
      }

      setClassification(data);
      setShowConfirmation(true);
    } catch (error) {
      setErrorMessage('Failed to analyze transaction. Please try again.');
      console.error('Classification error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const transcribeAndAnalyze = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    setSpeechError(null);
    setSpeechPreview(isLuganda ? 'Nkyusa eddoboozi lyo...' : 'Transcribing your speech...');

    try {
      const audioFile = new File([audioBlob], 'voice-note.webm', { type: audioBlob.type || 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('lang', isLuganda ? 'luganda' : 'english');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 503) {
          setHasServerTranscription(false);
          setSpeechError(
            hasBrowserSpeechSupport
              ? (isLuganda
                ? 'Server voice transcription teriiko key/provider. Tugenda kukozesa browser speech mode. Nyiga mic nate.'
                : 'Server voice transcription is not configured. Switching to browser speech mode. Tap mic again.')
              : (isLuganda
                ? 'Server voice transcription teriiko key/provider, era browser speech tewagirwa. Wandiika transaction.'
                : 'Server voice transcription is not configured and browser speech is unsupported. Please type the transaction.')
          );
          return;
        }
        setSpeechError(data.error || (isLuganda ? 'Okukyusa eddoboozi kulemye.' : 'Transcription failed.'));
        return;
      }

      const transcript = normalizeTranscript(String(data.text || ''));
      if (!transcript) {
        setSpeechError(isLuganda ? 'Tewali bigambo bifuniddwa. Gezaako nate.' : 'No speech was captured. Please try again.');
        return;
      }

      setText(transcript);
      setSpeechPreview(transcript);
      await analyzeTransactionText(transcript);
    } catch (error) {
      console.error('Transcription error:', error);
      setSpeechError(
        isLuganda
          ? 'Tetusobodde kukola ku ddoboozi lyo. Gezaako nate.'
          : 'Could not process your voice right now. Please try again.'
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const stopMediaTracks = () => {
    if (!mediaStreamRef.current) return;
    mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const toggleListening = async () => {
    const canUseServerMode = hasServerTranscription && hasMediaRecorderSupport;
    const canUseBrowserMode = hasBrowserSpeechSupport;

    if (!canUseServerMode && !canUseBrowserMode) {
      setSpeechError(
        isLuganda
          ? 'Browser eno tewagira okukwata eddoboozi.'
          : 'Voice recording is not supported in this browser.'
      );
      return;
    }

    if (isListening) {
      if (listeningModeRef.current === 'server') {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } else {
        try {
          browserRecognitionRef.current?.stop();
        } catch {
          // no-op
        }
      }
      stopMediaTracks();
      setIsListening(false);
      listeningModeRef.current = null;
    } else {
      setText('');
      setSpeechPreview('');
      setSpeechError(null);

      if (!canUseServerMode && canUseBrowserMode) {
        try {
          listeningModeRef.current = 'browser';
          browserRecognitionRef.current?.start();
          setIsListening(true);
          return;
        } catch {
          setSpeechError(
            isLuganda
              ? 'Tetusobodde kutandika browser speech recognition. Gezaako nate.'
              : 'Could not start browser speech recognition. Please try again.'
          );
          setIsListening(false);
          return;
        }
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        mediaStreamRef.current = stream;
        audioChunksRef.current = [];

        const mimeTypeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
        const supportedMimeType = mimeTypeCandidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
        const recorder = supportedMimeType
          ? new MediaRecorder(stream, { mimeType: supportedMimeType })
          : new MediaRecorder(stream);

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || 'audio/webm',
          });
          audioChunksRef.current = [];
          stopMediaTracks();

          if (audioBlob.size < 1024) {
            setSpeechError(isLuganda ? 'Tewali ddoboozi limaze okuwulirwa. Gezaako nate.' : 'No clear audio captured. Please try again.');
            return;
          }

          await transcribeAndAnalyze(audioBlob);
        };

        recorder.onerror = () => {
          setSpeechError(
            isLuganda
              ? 'Okukwata eddoboozi kulemye. Gezaako nate.'
              : 'Voice capture failed. Please try again.'
          );
          stopMediaTracks();
          setIsListening(false);
        };

        mediaRecorderRef.current = recorder;
        listeningModeRef.current = 'server';
        recorder.start(250);
        setIsListening(true);
      } catch {
        setSpeechError(
          isLuganda
            ? 'Tetusobodde kutandika microphone. Kiriza microphone permissions ogezeeko nate.'
            : 'Could not start microphone. Allow microphone access and try again.'
        );
        stopMediaTracks();
        setIsListening(false);
      }
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    await analyzeTransactionText(text);
  };

  const handleConfirm = async () => {
    if (!classification) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const mapped = mapClassificationToApiPayload(classification);
      const transaction = {
        type: mapped.type,
        product: classification.product || 'General',
        quantity: classification.quantity || 1,
        amount: classification.amount || 0,
        customer: classification.customer || 'walk-in',
        payment_type: mapped.payment_type,
      };

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to record transaction');
        return;
      }

      setSuccessMessage(isLuganda ? 'Ettransaksoni ewedde mu kifo kya butuufu!' : 'Transaction recorded successfully!');
      setText('');
      setShowConfirmation(false);
      setClassification(null);
      
      setTimeout(() => {
        setSuccessMessage(null);
        onTransactionAdded();
      }, 2000);
    } catch (error) {
      setErrorMessage('Failed to record transaction');
      console.error('Record error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full">
      {/* Main Entry Bar */}
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 p-6 rounded-xl shadow-sm border-2 border-violet-200 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-violet-600" />
          <h2 className="text-lg font-bold text-black">
            {isLuganda ? 'Mu AI Business Assistant' : 'TUNDA AI Business Assistant'}
          </h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          {isLuganda 
            ? 'Tegeeza ettransaksyo yo, naye gwe tolina bumanyi bw\'accounts. AI ijja kusiga mu kifo kya butuufu.'
            : 'Just describe your transaction. Our AI will place it in the right category.'}
        </p>

        <form onSubmit={handleAnalyze} className="relative">
          <div className="relative flex items-center">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={isLuganda 
                ? 'Ekyocwala: "Waliddemu simu kulya 50k" atau sebutkan transaksi Anda...'
                : 'E.g., "Sold 5 units of rice for 50k cash" or describe your transaction...'}
              className="w-full p-4 pr-24 border border-violet-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:border-violet-600 outline-none transition-all text-black placeholder-gray-500"
              disabled={isAnalyzing || isListening || isTranscribing}
              autoFocus
            />
            <div className="absolute right-2 flex space-x-2">
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-md transition-colors ${
                  isListening 
                    ? 'bg-violet-100 text-violet-600 animate-pulse' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                disabled={isAnalyzing || isTranscribing || (!hasMediaRecorderSupport && !hasBrowserSpeechSupport)}
                title={isListening ? 'Stop listening' : 'Start listening'}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button
                type="submit"
                disabled={isAnalyzing || isTranscribing || !text.trim() || isListening}
                className="bg-violet-600 text-white p-2 rounded-md hover:bg-violet-700 disabled:opacity-50 transition-colors"
                title="Analyze transaction"
              >
                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </form>

        {speechError && (
          <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {speechError}
          </p>
        )}

        {isTranscribing && (
          <p className="mt-3 text-sm text-violet-800 bg-violet-100 border border-violet-200 rounded-md px-3 py-2">
            {isLuganda ? 'AI ekyakyusa eddoboozi mu bigambo...' : 'AI is transcribing your speech...'}
          </p>
        )}
      </div>

      {isListening && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center px-4">
          <div className="w-full max-w-xl text-center text-white">
            <p className="text-xs uppercase tracking-[0.3em] text-violet-200 mb-6">
              {isLuganda ? 'Listening mode' : 'Listening mode'}
            </p>

            <div className="relative mx-auto mb-7 h-52 w-52">
              <div className="absolute inset-0 rounded-full bg-violet-500/30 animate-ping"></div>
              <div className="absolute inset-4 rounded-full bg-violet-500/35 animate-pulse"></div>
              <div className="absolute inset-10 rounded-full bg-violet-400/45"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Mic className="w-14 h-14 text-white" />
              </div>
            </div>

            <div className="mb-5 flex items-end justify-center gap-2" aria-hidden="true">
              <span className="w-2 h-6 rounded bg-violet-300 animate-pulse"></span>
              <span className="w-2 h-10 rounded bg-violet-200 animate-pulse [animation-delay:0.1s]"></span>
              <span className="w-2 h-14 rounded bg-violet-100 animate-pulse [animation-delay:0.2s]"></span>
              <span className="w-2 h-9 rounded bg-violet-200 animate-pulse [animation-delay:0.3s]"></span>
              <span className="w-2 h-5 rounded bg-violet-300 animate-pulse [animation-delay:0.4s]"></span>
            </div>

            <p className="text-base text-violet-100 mb-2">
              {isLuganda ? 'Yogera kati. AI ewulira era ezuula etransaksyo yo.' : 'Speak now. AI is listening and interpreting your transaction.'}
            </p>
            <p className="min-h-10 text-lg font-semibold text-white mb-7">
              {speechPreview || (isLuganda ? 'Nkuwuliriza...' : 'Listening...')}
            </p>

            <button
              type="button"
              onClick={toggleListening}
              className="inline-flex items-center gap-2 rounded-full bg-white text-violet-800 px-6 py-3 font-bold hover:bg-violet-100 transition-colors"
            >
              <MicOff className="w-5 h-5" />
              {isLuganda ? 'Mala okuwulira' : 'Stop listening'}
            </button>
          </div>
        </div>
      )}

      {/* Classification Confirmation */}
      {showConfirmation && classification && (
        <div className="bg-white border-2 border-violet-300 rounded-xl p-6 mb-6 shadow-lg">
          <div className="flex items-start gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-violet-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-black mb-1">
                {isLuganda ? 'AI Ekizuula ky\'ettransaksyo' : 'AI Classified Your Transaction'}
              </h3>
              <p className="text-sm text-gray-600 mb-4">{classification.explanation}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">{isLuganda ? 'Kika' : 'Type'}</p>
              <p className="text-lg font-bold text-violet-600">{typeLabels[classification.type || 'cashSale']}</p>
            </div>
            {classification.product && (
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">{isLuganda ? 'Kintu' : 'Product'}</p>
                <p className="text-lg font-bold text-black">{classification.product}</p>
              </div>
            )}
            {classification.quantity && (
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">{isLuganda ? 'Kuwandiika' : 'Quantity'}</p>
                <p className="text-lg font-bold text-black">{classification.quantity}</p>
              </div>
            )}
            {classification.amount && (
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">{isLuganda ? 'Zaali' : 'Amount'}</p>
                <p className="text-lg font-bold text-violet-600">UGX {classification.amount.toLocaleString()}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowConfirmation(false);
                setClassification(null);
                setText('');
              }}
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              disabled={isProcessing}
            >
              {isLuganda ? 'Kiggyako' : 'Cancel'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex-1 bg-violet-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isLuganda ? 'Okuwayo...' : 'Processing...'}
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {isLuganda ? 'Kkiriza' : 'Confirm'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      {successMessage && (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 mb-6 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-800 font-semibold">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 font-semibold">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
