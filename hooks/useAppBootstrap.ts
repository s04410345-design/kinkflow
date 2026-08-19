import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AppData } from '@/lib/types';
import { loadCachedAppData } from '@/lib/persistence/appStorage';

type UseAppBootstrapOptions = {
  setAppData: Dispatch<SetStateAction<AppData>>;
};

export function useAppBootstrap({ setAppData }: UseAppBootstrapOptions) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setIsMounted(true);
      const cachedData = loadCachedAppData();
      if (cachedData) setAppData(cachedData);
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [setAppData]);

  return { isMounted };
}
