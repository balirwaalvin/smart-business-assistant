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
  const [lastResult, setLastResult] = useState<any>(null);
  const recognitionRef = useRef<any>(null);
  const { t } = useLang();

  const [inventoryItems, setInventoryItems] = useState<Array<{ product: string; price: number }>>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [manualType, setManualType] = useState<'sale' | 'purchase' | 'expense'>('sale');
  const [manualQuantity, setManualQuantity] = useState(1);
  const [manualAmount, setManualAmount] = useState(0);
  const [manualCustomer, setManualCustomer] = useState('walk-in');
  const [manualPaymentType, setManualPaymentType] = useState<'cash' | 'credit'>('cash');

  useEffect(() => {
    // Initialize Speech Recognition
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
          // Append the new transcript to the existing text
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
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setText(''); // Clear previous text when starting a new recording
      recognitionRef.current?.start();
      setIsListening(true);
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
            className="w-full p-4 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition-all text-black"
            disabled={isLoading}
          />
          <div className="absolute right-2 flex space-x-2">
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-md transition-colors ${
                isListening 
                  ? 'bg-red-100 text-red-600 animate-pulse' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isListening ? t('stopListening') : t('startListening')}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              type="submit"
              disabled={isLoading || !text.trim()}
              className="bg-red-600 text-white p-2 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </form>

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
            className="w-full bg-red-600 text-white py-2.5 rounded-md text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
          >
            {isManualLoading ? t('recordingStockTransaction') : t('recordStockTransactionButton')}
          </button>
        </form>
      </div>
    </div>
  );
}
