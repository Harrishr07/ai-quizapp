'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // In development, remove any prior service worker/caches so UI changes appear immediately.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
        .then(() =>
          caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        )
        .catch(() => {
          // Ignore cleanup failures to avoid breaking app startup.
        });
      return;
    }

    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Keep silent in production if SW registration fails.
      });
    };

    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
