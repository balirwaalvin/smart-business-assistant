'use client';

import { useEffect } from 'react';

export default function PwaRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const isProduction = process.env.NODE_ENV === 'production';

    const register = async () => {
      try {
        if (!isProduction) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
          return;
        }

        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch (error) {
        console.warn('Service worker registration failed:', error);
      }
    };

    register();
  }, []);

  return null;
}
