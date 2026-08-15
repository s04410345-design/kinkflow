import { useCallback, useEffect, useState } from 'react';
import { fetchAdminUsers, removeAdminRole, upsertAdminRole } from '@/lib/data/admin';

export type AdminRoleRecord = {
  user_id: string;
  role_level: number;
  granted_by?: string | null;
  created_at: string;
};

export function useAdminRoles(enabled: boolean) {
  const [admins, setAdmins] = useState<AdminRoleRecord[]>([]);
  const [emailOrUserId, setEmailOrUserId] = useState('');
  const [roleLevel, setRoleLevel] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      setAdmins(await fetchAdminUsers());
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '無法載入管理員清單';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(async (): Promise<{ ok: boolean; message?: string }> => {
    const target = emailOrUserId.trim();
    if (!target) return { ok: false, message: '請輸入 User ID（UUID）' };
    setIsLoading(true);
    setError(null);
    try {
      const result = await upsertAdminRole(target, roleLevel);
      if (result.ok) {
        setEmailOrUserId('');
        setRoleLevel(2);
        await refresh();
      } else {
        setError(result.message || '管理員權限更新失敗');
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [emailOrUserId, refresh, roleLevel]);

  const remove = useCallback(async (target: string): Promise<{ ok: boolean; message?: string }> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await removeAdminRole(target);
      if (result.ok) await refresh();
      else setError(result.message || '管理員權限移除失敗');
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [refresh]);

  return {
    admins,
    emailOrUserId,
    setEmailOrUserId,
    roleLevel,
    setRoleLevel,
    isLoading,
    error,
    save,
    remove,
    refresh,
  };
}
