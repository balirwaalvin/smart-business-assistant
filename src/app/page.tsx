'use client';

import { useEffect, useState } from 'react';
import TransactionInput from '@/components/TransactionInput';
import DashboardMetrics from '@/components/DashboardMetrics';
import RecentTransactions from '@/components/RecentTransactions';

export default function Home() {
  const [metrics, setMetrics] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchData = async () => {
    try {
      const [metricsRes, txRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/transactions')
      ]);
      
      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (txRes.ok) setTransactions(await txRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    // Initialize DB on first load
    fetch('/api/init').then(() => {
      setIsInitialized(true);
      fetchData();
    });
  }, []);

  if (!isInitialized) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-black">Initializing...</div>;
  }

  return (
    <main className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 border-b border-gray-200 pb-4">
          <h1 className="text-3xl font-bold text-black">Smart Business Assistant</h1>
          <p className="text-red-600 mt-2 font-medium">AI-powered business intelligence for SMEs</p>
        </header>

        <DashboardMetrics metrics={metrics} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <TransactionInput onTransactionAdded={fetchData} />
          </div>
          <div className="lg:col-span-2">
            <RecentTransactions transactions={transactions} />
          </div>
        </div>
      </div>
    </main>
  );
}
