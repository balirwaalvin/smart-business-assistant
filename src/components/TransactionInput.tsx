'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Mic, MicOff } from 'lucide-react';
import { useLang } from '@/contexts/LangContext';

// Add TypeScript support for the Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function TransactionInput({ onTransactionAdded }: { onTransactionAdded: () => void }) {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(true);
  const [speechPreview, setSpeechPreview] = useState('');
  const [speechError, setSpeechError] = useState('');
  const [lastResult, setLastResult] = useState<any>(null);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const isUserStoppingRef = useRef(false);
  const lastProcessedTranscriptRef = useRef('');
  const { t } = useLang();

  const [inventoryItems, setInventoryItems] = useState<Array<{ product: string; price: number }>>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [manualType, setManualType] = useState<'sale' | 'purchase' | 'expense'>('sale');
  const [manualQuantity, setManualQuantity] = useState(1);
  const [manualAmount, setManualAmount] = useState(0);
  const [manualCustomer, setManualCustomer] = useState('walk-in');
  const [manualPaymentType, setManualPaymentType] = useState<'cash' | 'credit'>('cash');

  const normalizeTranscript = (input: string) => input.replace(/\s+/g, ' ').trim();

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    // Initialize Speech Recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
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
          if (!combinedTranscript || combinedTranscript === lastProcessedTranscriptRef.current) {
            return;
          }

          lastProcessedTranscriptRef.current = combinedTranscript;
          setSpeechPreview(combinedTranscript);
          setText(combinedTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setSpeechError('Could not clearly hear you. Please tap the mic and try again.');
          setIsListening(false);
          isUserStoppingRef.current = false;
        };

        recognitionRef.current.onend = () => {
          if (isUserStoppingRef.current) {
            isUserStoppingRef.current = false;
            setIsListening(false);
            return;
          }

          if (isListeningRef.current) {
            setTimeout(() => {
              try {
                recognitionRef.current?.start();
              } catch {
                setIsListening(false);
              }
            }, 120);
          }
        };
      } else {
        setHasSpeechSupport(false);
      }
    }
  }, []);

  useEffect(() => {
    const fetchInventoryItems = async () => {
      try {
        const response = await fetch('/api/inventory');
        if (!response.ok) return;
        const data = await response.json();
        setInventoryItems(data);
      } catch (error) {
        console.error('Failed to fetch inventory products:', error);
      }
    };

    fetchInventoryItems();
  }, []);

  useEffect(() => {
    if (manualType !== 'sale' || !selectedProduct) return;
    const matched = inventoryItems.find((item) => item.product === selectedProduct);
    if (!matched || matched.price <= 0) return;
    setManualAmount(matched.price * Math.max(1, manualQuantity));
  }, [inventoryItems, manualQuantity, manualType, selectedProduct]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setSpeechError('Speech input is not supported in this browser.');
      return;
    }

    if (isListening) {
      isUserStoppingRef.current = true;
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setText('');
      setSpeechPreview('');
      setSpeechError('');
      lastProcessedTranscriptRef.current = '';
      isUserStoppingRef.current = false;

      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch {
        setSpeechError('Microphone is currently unavailable. Please try again.');
        setIsListening(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsLoading(true);
    setLastResult(null);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();
      
      if (data.success) {
        setLastResult(data.parsed);
        setText('');
        onTransactionAdded();
      }
    } catch (error) {
      console.error('Failed to submit transaction', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct.trim()) return;

    setIsManualLoading(true);
    setLastResult(null);

    try {
      const transaction = {
        type: manualType,
        product: selectedProduct,
        quantity: manualQuantity,
        customer: manualCustomer || 'walk-in',
        payment_type: manualPaymentType,
        amount: manualAmount,
      };

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction }),
      });

      const data = await res.json();
      if (data.success) {
        setLastResult(data.parsed);
        onTransactionAdded();
      }
    } catch (error) {
      console.error('Failed to submit manual transaction', error);
    } finally {
      setIsManualLoading(false);
    }
  };

  const onProductSelect = (value: string) => {
    setSelectedProduct(value);
    const matched = inventoryItems.find((item) => item.product === value);
    if (matched && matched.price > 0 && manualType === 'sale') {
      setManualAmount(matched.price * Math.max(1, manualQuantity));
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-lg font-bold mb-4 text-black">{t('recordTransaction')}</h2>
      
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('transactionPlaceholder')}
            className="w-full p-4 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:border-violet-600 outline-none transition-all text-black"
            disabled={isLoading}
          />
          <div className="absolute right-2 flex space-x-2">
            <button
              type="button"
              onClick={toggleListening}
              disabled={!hasSpeechSupport || isLoading}
              className={`p-2 rounded-md transition-colors ${
                isListening 
                  ? 'bg-violet-100 text-violet-600 animate-pulse' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isListening ? t('stopListening') : t('startListening')}
              aria-pressed={isListening}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              type="submit"
              disabled={isLoading || !text.trim()}
              className="bg-violet-600 text-white p-2 rounded-md hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </form>

      {isListening && (
        <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-violet-600"></span>
              </span>
              <p className="text-sm font-semibold text-violet-800">Listening mode active</p>
            </div>
            <div className="flex items-end gap-1" aria-hidden="true">
              <span className="h-2 w-1 rounded bg-violet-500 animate-pulse"></span>
              <span className="h-4 w-1 rounded bg-violet-500 animate-pulse [animation-delay:0.15s]"></span>
              <span className="h-3 w-1 rounded bg-violet-500 animate-pulse [animation-delay:0.3s]"></span>
              <span className="h-5 w-1 rounded bg-violet-500 animate-pulse [animation-delay:0.45s]"></span>
            </div>
          </div>
          <p className="mt-2 text-sm text-violet-900">{speechPreview || 'Speak now. Tap the mic again when finished.'}</p>
        </div>
      )}

      {speechError && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{speechError}</p>
      )}

      {lastResult && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-black">
          <p className="text-sm text-black font-bold mb-2">{t('transactionSuccess')}</p>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-800">
            <div><span className="font-semibold">{t('typeLabel')}:</span> {lastResult.type}</div>
            <div><span className="font-semibold">{t('productLabel')}:</span> {lastResult.product}</div>
            <div><span className="font-semibold">{t('quantityLabel')}:</span> {lastResult.quantity}</div>
            <div><span className="font-semibold">{t('customerLabel')}:</span> {lastResult.customer}</div>
            <div><span className="font-semibold">{t('paymentLabel')}:</span> {lastResult.payment_type}</div>
            <div><span className="font-semibold">{t('amountLabel')}:</span> UGX {lastResult.amount?.toLocaleString() || 0}</div>
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-gray-100 pt-5">
        <h3 className="text-sm font-bold text-black mb-3">{t('recordFromStockTitle')}</h3>
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <select
            value={selectedProduct}
            onChange={(e) => onProductSelect(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md text-sm"
            required
          >
            <option value="">{t('selectStockProduct')}</option>
            {inventoryItems.map((item) => (
              <option key={item.product} value={item.product}>
                {item.product}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={manualType}
              onChange={(e) => setManualType(e.target.value as 'sale' | 'purchase' | 'expense')}
              className="w-full p-3 border border-gray-300 rounded-md text-sm"
            >
              <option value="sale">{t('typeSale')}</option>
              <option value="purchase">{t('typePurchase')}</option>
              <option value="expense">{t('typeExpense')}</option>
            </select>
            <select
              value={manualPaymentType}
              onChange={(e) => setManualPaymentType(e.target.value as 'cash' | 'credit')}
              className="w-full p-3 border border-gray-300 rounded-md text-sm"
            >
              <option value="cash">{t('typeCash')}</option>
              <option value="credit">{t('typeCredit')}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={manualQuantity}
              min={1}
              onChange={(e) => setManualQuantity(Number(e.target.value) || 1)}
              placeholder={t('quantityLabel')}
              className="w-full p-3 border border-gray-300 rounded-md text-sm"
            />
            <input
              type="number"
              value={manualAmount}
              min={0}
              onChange={(e) => setManualAmount(Number(e.target.value) || 0)}
              placeholder={t('amountLabel')}
              className="w-full p-3 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <input
            type="text"
            value={manualCustomer}
            onChange={(e) => setManualCustomer(e.target.value)}
            placeholder={t('customerLabel')}
            className="w-full p-3 border border-gray-300 rounded-md text-sm"
          />

          <button
            type="submit"
            disabled={isManualLoading}
            className="w-full bg-violet-600 text-white py-2.5 rounded-md text-sm font-semibold hover:bg-violet-700 disabled:opacity-60"
          >
            {isManualLoading ? t('recordingStockTransaction') : t('recordStockTransactionButton')}
          </button>
        </form>
      </div>
    </div>
  );
}
