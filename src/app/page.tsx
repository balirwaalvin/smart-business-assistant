'use client';

import { useEffect, useState } from 'react';
import { UserButton, SignedIn, SignedOut, SignInButton, useAuth } from '@clerk/nextjs';
import TransactionInput from '@/components/TransactionInput';
import DashboardMetrics from '@/components/DashboardMetrics';
import RecentTransactions from '@/components/RecentTransactions';
import ExcelUpload from '@/components/ExcelUpload';
import InventoryManager from '@/components/InventoryManager';
import Footer from '@/components/Footer';
import Image from 'next/image';
import { useLang } from '@/contexts/LangContext';

export default function Home() {
  const { isSignedIn } = useAuth();
  const { t, toggleLang } = useLang();
  const [metrics, setMetrics] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetAckChecked, setResetAckChecked] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportRange, setExportRange] = useState<'all' | 'last7' | 'thisMonth' | 'custom'>('all');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);

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

  const openResetModal = () => {
    setResetMessage(null);
    setResetError(null);
    setResetAckChecked(false);
    setResetConfirmText('');
    setShowResetModal(true);
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetAckChecked(false);
    setResetConfirmText('');
  };

  const handleResetAccountData = async () => {
    if (!resetAckChecked || resetConfirmText.trim().toUpperCase() !== 'RESET') {
      setResetError(t('resetDataCancel'));
      setResetMessage(null);
      return;
    }

    setIsResetting(true);
    setResetError(null);
    setResetMessage(null);

    try {
      const response = await fetch('/api/account/reset', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to reset account data');
      }

      setResetMessage(t('resetDataSuccess'));
      closeResetModal();
      await fetchData();
    } catch (error) {
      console.error('Error resetting account data:', error);
      setResetError(t('resetDataFailed'));
    } finally {
      setIsResetting(false);
    }
  };

  const handleExportRecords = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const now = new Date();
      let fromDate = '';
      let toDate = '';

      if (exportRange === 'last7') {
        const from = new Date(now);
        from.setDate(now.getDate() - 6);
        fromDate = `${from.toISOString().slice(0, 10)}T00:00:00.000Z`;
        toDate = `${now.toISOString().slice(0, 10)}T23:59:59.999Z`;
      } else if (exportRange === 'thisMonth') {
        const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        fromDate = from.toISOString();
        toDate = `${now.toISOString().slice(0, 10)}T23:59:59.999Z`;
      } else if (exportRange === 'custom') {
        if (!customFromDate || !customToDate) {
          setExportError(t('exportDateValidation'));
          setIsExporting(false);
          return;
        }
        fromDate = `${customFromDate}T00:00:00.000Z`;
        toDate = `${customToDate}T23:59:59.999Z`;
      }

      const params = new URLSearchParams();
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);

      const exportUrl = params.toString() ? `/api/export?${params.toString()}` : '/api/export';
      window.location.href = exportUrl;
    } finally {
      setTimeout(() => {
        setIsExporting(false);
      }, 1000);
    }
  };

  if (!isInitialized) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-black">{t('initializing')}</div>;
  }

  return (
    <>
      <main className="min-h-screen bg-white p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8 border-b border-gray-200 pb-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Image src="/TUNDA Logo.png" alt="TUNDA Logo" width={48} height={48} style={{ borderRadius: '12px' }} />
              <div>
                <h1 className="text-3xl font-bold text-black">Tunda Business Assistant</h1>
                <p className="text-violet-600 mt-1 font-medium text-sm">{t('poweredBy')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleLang}
                className="px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-300 hover:border-red-500 hover:text-red-600 transition-colors text-gray-600"
              >
                🌐 {t('switchToLang')}
              </button>
              <SignedIn>
                <UserButton />
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors">
                    {t('signIn')}
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
                <InventoryManager onInventoryChanged={fetchData} />
                <ExcelUpload onUploadComplete={fetchData} />
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-sm font-bold text-black">{t('exportRecordsTitle')}</h3>
                  <p className="text-xs text-gray-600 mt-2">{t('exportRecordsDescription')}</p>

                  <div className="mt-3 space-y-2">
                    <label className="text-xs font-semibold text-gray-700">{t('exportRangeLabel')}</label>
                    <select
                      value={exportRange}
                      onChange={(e) => setExportRange(e.target.value as 'all' | 'last7' | 'thisMonth' | 'custom')}
                      className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="all">{t('exportRangeAll')}</option>
                      <option value="last7">{t('exportRangeLast7')}</option>
                      <option value="thisMonth">{t('exportRangeThisMonth')}</option>
                      <option value="custom">{t('exportRangeCustom')}</option>
                    </select>
                  </div>

                  {exportRange === 'custom' && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-semibold text-gray-700">{t('exportFromLabel')}</label>
                        <input
                          type="date"
                          value={customFromDate}
                          onChange={(e) => setCustomFromDate(e.target.value)}
                          className="mt-1 w-full p-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700">{t('exportToLabel')}</label>
                        <input
                          type="date"
                          value={customToDate}
                          onChange={(e) => setCustomToDate(e.target.value)}
                          className="mt-1 w-full p-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {exportError && <p className="mt-2 text-xs text-red-700">{exportError}</p>}

                  <button
                    onClick={handleExportRecords}
                    disabled={isExporting}
                    className="mt-4 w-full bg-black text-white px-4 py-2.5 rounded-md hover:bg-gray-800 transition-colors text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isExporting ? t('exportingRecords') : t('downloadExcelButton')}
                  </button>
                </div>
                <div className="bg-white p-5 rounded-xl border border-red-200 shadow-sm">
                  <h3 className="text-sm font-bold text-red-700">{t('resetDataTitle')}</h3>
                  <p className="text-xs text-gray-600 mt-2">{t('resetDataDescription')}</p>

                  {resetMessage && (
                    <p className="text-xs text-green-700 mt-3">{resetMessage}</p>
                  )}
                  {resetError && (
                    <p className="text-xs text-red-700 mt-3">{resetError}</p>
                  )}

                  <button
                    onClick={openResetModal}
                    disabled={isResetting}
                    className="mt-4 w-full bg-red-600 text-white px-4 py-2.5 rounded-md hover:bg-red-700 transition-colors text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isResetting ? t('resettingData') : t('resetDataButton')}
                  </button>
                </div>
              </div>
              <div className="lg:col-span-2">
                <RecentTransactions transactions={transactions} />
              </div>
            </div>
          </SignedIn>

          <SignedOut>
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold text-black mb-4">{t('welcomeTitle')}</h2>
              <p className="text-gray-600 mb-8">{t('welcomeSubtitle')}</p>
              <SignInButton mode="modal">
                <button className="bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 transition-colors text-lg font-medium">
                  {t('getStarted')}
                </button>
              </SignInButton>
            </div>
          </SignedOut>
        </div>
      </main>

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-red-200">
            <h3 className="text-lg font-bold text-red-700">{t('resetDataModalTitle')}</h3>
            <p className="text-sm text-gray-600 mt-2">{t('resetDataConfirm')}</p>

            <label className="mt-4 flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={resetAckChecked}
                onChange={(e) => setResetAckChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span>{t('resetDataAcknowledge')}</span>
            </label>

            <div className="mt-4">
              <label htmlFor="reset-confirm" className="block text-xs font-semibold text-gray-700 mb-1">
                {t('resetDataTypeResetLabel')}
              </label>
              <input
                id="reset-confirm"
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="RESET"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={closeResetModal}
                disabled={isResetting}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {t('resetDataCloseButton')}
              </button>
              <button
                type="button"
                onClick={handleResetAccountData}
                disabled={
                  isResetting || !resetAckChecked || resetConfirmText.trim().toUpperCase() !== 'RESET'
                }
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isResetting ? t('resettingData') : t('resetDataConfirmButton')}
              </button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </>
  );
}
