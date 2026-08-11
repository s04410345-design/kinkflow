import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SafeStorage } from '@/lib/constants';

export function useAuth() {
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset_password'>('login');
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // 輔助函式：優先從 profiles 表讀取最新名稱，fallback 到 user_metadata
    const resolveNameFromSession = async (session: any) => {
      const user = session?.user;
      if (!user) return null;

      // 優先從 profiles 表讀取（這是改名後最正確的資料來源）
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id);
      const profileRow = profileRows?.[0];

      if (profileRow?.username) {
        const cleanName = profileRow.username.replace(/ ☑️/g, '').replace(/ 👻/g, '').trim();
        return cleanName + ' ☑️';
      }

      // fallback: 從 user_metadata 讀取
      const meta = user.user_metadata || {};
      const baseName = meta.display_name || meta.full_name || meta.name || meta.preferred_username || user.email?.split('@')[0] || 'User';
      const cleanName = baseName.replace(/ ☑️/g, '').replace(/ 👻/g, '').trim();
      return cleanName + ' ☑️';
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const displayName = await resolveNameFromSession(session);
        if (displayName) setUserName(displayName);
        setUserId(session.user.id);
        setIsGuest(false);
      } else {
        const localUser = SafeStorage.get('kinkflow_user') as string | null;
        if (localUser) {
          const cleanName = localUser.replace(/ ☑️/g, '').replace(/ 👻/g, '').trim();
          setUserName(cleanName + ' 👻');
          setIsGuest(true);
        }
      }
    });

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
      } else {
        const localUser = SafeStorage.get('kinkflow_user') as string | null;
        if (localUser) {
          const cleanName = localUser.replace(/ ☑️/g, '').replace(/ 👻/g, '').trim();
          setUserName(cleanName + ' 👻');
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
