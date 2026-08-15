import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AppData } from '@/lib/types';
import { persistAppData } from '@/lib/persistence/appStorage';

type AppDataUpdater = AppData | ((previous: AppData) => AppData);

export function usePersistedAppData(setAppData: Dispatch<SetStateAction<AppData>>) {
  return useCallback((updater: AppDataUpdater) => {
    setAppData((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater;
      persistAppData(next);
      return next;
    });
  }, [setAppData]);
}
