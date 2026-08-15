import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { formatMemberName, getStoredGuestName } from '@/lib/auth/identity';

export function useAuth() {
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset_password'>('login');
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // 輔助函式：優先從 profiles 表讀取最新名稱，fallback 到 user_metadata
    const resolveNameFromSession = async (session: Session | null) => {
      const user = session?.user;
      if (!user) return null;

      // 優先從 profiles 表讀取（這是改名後最正確的資料來源）
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id);
      const profileRow = profileRows?.[0];

      if (profileRow?.username) {
        return formatMemberName(profileRow.username);
      }

      // fallback: 從 user_metadata 讀取
      const meta = user.user_metadata || {};
      const baseName = meta.display_name || meta.full_name || meta.name || meta.preferred_username || user.email?.split('@')[0] || 'User';
      return formatMemberName(baseName);
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const displayName = await resolveNameFromSession(session);
        if (displayName) setUserName(displayName);
        setUserId(session.user.id);
        setIsGuest(false);
      } else {
        const localUser = getStoredGuestName();
        if (localUser) {
          setUserName(localUser);
          setIsGuest(true);
        }
      }
    });

    const redirectAfterAuth = () => {
      try {
        const raw = window.localStorage.getItem('kinkflow_auth_return_to');
        if (!raw) return;
        const target = JSON.parse(raw) as { path?: string; expiresAt?: number };
        window.localStorage.removeItem('kinkflow_auth_return_to');
        if (target.path === '/admin' && target.expiresAt && target.expiresAt > Date.now() && window.location.pathname !== '/admin') {
          window.location.replace('/admin');
        }
      } catch {
        window.localStorage.removeItem('kinkflow_auth_return_to');
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('reset_password');
        setShowAuthModal(true);
      }
      if (session?.user) {
        const displayName = await resolveNameFromSession(session);
        if (displayName) setUserName(displayName);
        setUserId(session.user.id);
        setIsGuest(false);
        redirectAfterAuth();
      } else {
        const localUser = getStoredGuestName();
        if (localUser) {
          setUserName(localUser);
          setIsGuest(true);
        } else {
          setUserName(null);
          setUserId(null);
          setIsGuest(true);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return {
    userName,
    setUserName,
    userId,
    setUserId,
    isGuest,
    setIsGuest,
    authMode,
    setAuthMode,
    showAuthModal,
    setShowAuthModal
  };
}
