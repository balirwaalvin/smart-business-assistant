'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

export default function TransactionInput({ onTransactionAdded }: { onTransactionAdded: () => void }) {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

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

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-lg font-bold mb-4 text-black">Record Transaction</h2>
      
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g., Sold 3 sodas to Grace on credit"
          className="w-full p-4 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition-all text-black"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="absolute right-2 top-2 bottom-2 bg-red-600 text-white p-2 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </form>

      {lastResult && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-black">
          <p className="text-sm text-black font-bold mb-2">Transaction recorded successfully!</p>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-800">
            <div><span className="font-semibold">Type:</span> {lastResult.type}</div>
            <div><span className="font-semibold">Product:</span> {lastResult.product}</div>
            <div><span className="font-semibold">Quantity:</span> {lastResult.quantity}</div>
            <div><span className="font-semibold">Customer:</span> {lastResult.customer}</div>
            <div><span className="font-semibold">Payment:</span> {lastResult.payment_type}</div>
            <div><span className="font-semibold">Amount:</span> UGX {lastResult.amount.toLocaleString()}</div>
          </div>
        </div>
      )}
    </div>
  );
}
