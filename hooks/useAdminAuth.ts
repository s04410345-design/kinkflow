import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type AdminAuthState = {
  isAuth: boolean;
  adminLevel: number | null;
  adminEmail: string;
  authError: string;
  isChecking: boolean;
};

export function useAdminAuth(): AdminAuthState & { logout: () => Promise<void> } {
  const [isAuth, setIsAuth] = useState(false);
  const [adminLevel, setAdminLevel] = useState<number | null>(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let active = true;

    const reset = () => {
      if (!active) return;
      setIsAuth(false);
      setAdminLevel(null);
      setAdminEmail('');
    };

    const checkRole = async (user: User | null) => {
      if (!active) return;
      if (!user) {
        reset();
        setIsChecking(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('admin_roles')
          .select('role_level')
          .eq('user_id', user.id)
          .single();
        if (!active) return;
        if (error || !data) {
          setAuthError('❌ 此帳號無管理員權限');
          await supabase.auth.signOut();
          reset();
        } else {
          setAdminEmail(user.email || user.id);
          setAdminLevel(data.role_level as number);
          setIsAuth(true);
          setAuthError('');
        }
      } catch (error) {
        console.error('admin role check failed', error);
        if (active) setAuthError('❌ 權限驗證失敗');
      } finally {
        if (active) setIsChecking(false);
      }
    };

    void supabase.auth.getSession().then(({ data: { session } }) => checkRole(session?.user || null));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      void checkRole(session?.user || null);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setIsAuth(false);
    setAdminLevel(null);
    setAdminEmail('');
  };

  return { isAuth, adminLevel, adminEmail, authError, isChecking, logout };
}
