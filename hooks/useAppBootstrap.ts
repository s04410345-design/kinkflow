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

    setIsMounted(true);

    const cachedData = loadCachedAppData();
    if (cachedData && !cancelled) {
      setAppData(cachedData);
    }

    return () => {
      cancelled = true;
    };
  }, [setAppData]);

  return { isMounted };
}
