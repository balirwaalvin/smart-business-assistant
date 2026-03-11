'use client';

import { useEffect, useState } from 'react';
import { UserButton, SignedIn, SignedOut, SignInButton, useAuth } from '@clerk/nextjs';
import TransactionInput from '@/components/TransactionInput';
import DashboardMetrics from '@/components/DashboardMetrics';
import RecentTransactions from '@/components/RecentTransactions';
import ExcelUpload from '@/components/ExcelUpload';
import Footer from '@/components/Footer';

export default function Home() {
  const { isSignedIn } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchData = async () => {
    if (!isSignedIn) return;
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
    });
  }, []);

  useEffect(() => {
    if (isInitialized && isSignedIn) {
      fetchData();
    }
  }, [isInitialized, isSignedIn]);

  if (!isInitialized) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-black">Initializing...</div>;
  }

  return (
    <>
      <main className="min-h-screen bg-white p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8 border-b border-gray-200 pb-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div style={{ background: 'linear-gradient(135deg,#6D28D9,#1E40AF)', borderRadius: '12px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(109,40,217,0.35)' }}>
                <svg width="36" height="36" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 14h-5v4h3a5 5 0 1 1 0-8 5 5 0 0 1 3.54 1.46" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <circle cx="14" cy="14" r="1.2" fill="#D4AF37" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-black">Tunda Business Assistant</h1>
                <p className="text-violet-600 mt-1 font-medium text-sm">Powered by TUNDA AI — AI for SMEs</p>
              </div>
            </div>
            <div>
              <SignedIn>
                <UserButton />
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors">
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>
            </div>
          </header>

          <SignedIn>
            <DashboardMetrics metrics={metrics} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 flex flex-col gap-6">
                <TransactionInput onTransactionAdded={fetchData} />
                <ExcelUpload onUploadComplete={fetchData} />
              </div>
              <div className="lg:col-span-2">
                <RecentTransactions transactions={transactions} />
              </div>
            </div>
          </SignedIn>

          <SignedOut>
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold text-black mb-4">Welcome to Tunda Business Assistant</h2>
              <p className="text-gray-600 mb-8">Please sign in to let TUNDA AI manage your business transactions and dashboard.</p>
              <SignInButton mode="modal">
                <button className="bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 transition-colors text-lg font-medium">
                  Get Started
                </button>
              </SignInButton>
            </div>
          </SignedOut>
        </div>
      </main>
      <Footer />
    </>
  );
}
