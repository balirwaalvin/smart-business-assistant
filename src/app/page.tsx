'use client';

import { useEffect, useState } from 'react';
import DoubleEntryDashboard from '@/components/DoubleEntryDashboard';
import Footer from '@/components/Footer';
import Image from 'next/image';
import { useLang } from '@/contexts/LangContext';

type AuthUser = {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  avatarFileId?: string | null;
};

export default function Home() {
  const { t, toggleLang } = useLang();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [profileName, setProfileName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
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
  const [showProfileModal, setShowProfileModal] = useState(false);

  const isSignedIn = Boolean(authUser);

  const refreshAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (!res.ok) {
        setAuthUser(null);
        return;
      }

      const payload = await res.json();
      const nextUser = payload.user ?? null;
      setAuthUser(nextUser);
      setProfileName(nextUser?.name ?? '');
    } catch {
      setAuthUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  };

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
    refreshAuth();
  }, []);

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

  const handleSignOut = async () => {
    await fetch('/api/auth/sign-out', {
      method: 'POST',
    });

    setAuthUser(null);
    setProfileName('');
    setMetrics(null);
    setTransactions([]);
  };

  const handleProfileNameSave = async () => {
    const trimmed = profileName.trim();
    if (!trimmed) {
      setProfileError('Name cannot be empty.');
      setProfileMessage(null);
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);
    setProfileMessage(null);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to update profile');
      }

      setProfileMessage('Profile updated successfully.');
      await refreshAuth();
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    setProfileError(null);
    setProfileMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/auth/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to upload profile image');
      }

      setProfileMessage('Profile picture updated successfully.');
      await refreshAuth();
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Failed to upload profile image');
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = '';
    }
  };

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

  if (!isInitialized || isAuthLoading) {
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
              {isSignedIn ? (
                <>
                  <span className="hidden sm:inline text-xs text-gray-500">{authUser?.email}</span>
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className="h-10 w-10 rounded-full border border-gray-200 hover:border-gray-400 transition-colors flex items-center justify-center overflow-hidden cursor-pointer bg-gray-100"
                    title="Edit profile"
                  >
                    {authUser?.avatarUrl ? (
                      <Image
                        src={authUser.avatarUrl}
                        alt="Profile"
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-sm font-bold text-gray-700">
                        {authUser?.name?.slice(0, 2).toUpperCase() || 'TU'}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <a href="/sign-in" className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors">
                  {t('signIn')}
                </a>
              )}
            </div>
          </header>

          {isSignedIn ? (
            <>
              <DoubleEntryDashboard metrics={metrics} onTransactionAdded={fetchData} />
            </>
          ) : null}

          {!isSignedIn ? (
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold text-black mb-4">{t('welcomeTitle')}</h2>
              <p className="text-gray-600 mb-8">{t('welcomeSubtitle')}</p>
              <a href="/sign-in" className="inline-block bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 transition-colors text-lg font-medium">
                {t('getStarted')}
              </a>
            </div>
          ) : null}
        </div>
      </main>

      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200">
            <h3 className="text-lg font-bold text-black">My TUNDA Profile</h3>
            <p className="text-sm text-gray-600 mt-1">Edit your profile information</p>

            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-4">
                {authUser?.avatarUrl ? (
                  <Image
                    src={authUser.avatarUrl}
                    alt="Profile picture"
                    width={64}
                    height={64}
                    className="rounded-full border border-gray-200 object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-700">
                    {authUser?.name?.slice(0, 2).toUpperCase() || 'TU'}
                  </div>
                )}

                <label className="text-sm font-semibold text-red-600 hover:text-red-700 cursor-pointer">
                  {isUploadingAvatar ? 'Uploading...' : 'Change picture'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                    disabled={isUploadingAvatar}
                  />
                </label>
              </div>

              <div>
                <label htmlFor="profile-name-modal" className="block text-xs font-semibold text-gray-700">Name</label>
                <input
                  id="profile-name-modal"
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-600">{authUser?.email}</p>
              </div>

              {profileMessage ? <p className="text-xs text-green-700">{profileMessage}</p> : null}
              {profileError ? <p className="text-xs text-red-700">{profileError}</p> : null}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                disabled={isSavingProfile || isUploadingAvatar}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleProfileNameSave}
                disabled={isSavingProfile || isUploadingAvatar}
                className="flex-1 rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
              >
                {isSavingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

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
