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

export default function IntelligentTransactionEntry({ onTransactionAdded }: { onTransactionAdded: () => void }) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const { t, isLuganda } = useLang();

  const typeLabels: Record<string, string> = {
    cashSale: isLuganda ? 'Entunda (Cash)' : 'Sale (Cash)',
    creditSale: isLuganda ? 'Entunda (Credit)' : 'Sale (Credit)',
    cashPurchase: isLuganda ? 'Ebiguliddwa (Cash)' : 'Purchase (Cash)',
    creditPurchase: isLuganda ? 'Ebiguliddwa (Credit)' : 'Purchase (Credit)',
    expense: isLuganda ? 'Ensaasaanya' : 'Expense',
    drawing: isLuganda ? 'Okukwata' : 'Drawing',
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setText((prev) => {
            const newText = prev + (prev.endsWith(' ') ? '' : ' ') + currentTranscript;
            return newText.trim();
          });
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setText('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsAnalyzing(true);
    setErrorMessage(null);
    setClassification(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/transactions/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang: isLuganda ? 'luganda' : 'english' }),
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

  const handleConfirm = async () => {
    if (!classification) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const transaction = {
        type: classification.type,
        product: classification.product || 'General',
        quantity: classification.quantity || 1,
        amount: classification.amount || 0,
        customer: classification.customer || 'walk-in',
        payment_type: classification.payment_type || 'cash',
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
              disabled={isAnalyzing || isListening}
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
                disabled={isAnalyzing}
                title={isListening ? 'Stop listening' : 'Start listening'}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button
                type="submit"
                disabled={isAnalyzing || !text.trim() || isListening}
                className="bg-violet-600 text-white p-2 rounded-md hover:bg-violet-700 disabled:opacity-50 transition-colors"
                title="Analyze transaction"
              >
                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </form>
      </div>

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
