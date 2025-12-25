'use client';

import { useEffect } from 'react';

export function LiveSync() {
  useEffect(() => {
    // Initial sync
    const triggerSync = async () => {
      try {
        await fetch('/api/sync', { method: 'GET' });
      } catch (e) {
        // Silently fail
      }
    };

    triggerSync();

    // Set up interval for every 60 seconds
    const interval = setInterval(triggerSync, 60000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
