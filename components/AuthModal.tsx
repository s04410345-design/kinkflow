"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthModal({ onClose, onLoginSuccess, defaultMode = 'login', redirectPath }: { onClose: () => void, onLoginSuccess?: (user: unknown) => void, defaultMode?: 'login' | 'register' | 'reset_password', redirectPath?: string }) {
  const [isLogin, setIsLogin] = useState(defaultMode === 'login');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(defaultMode === 'reset_password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getRedirectUrl = () => {
    if (redirectPath?.startsWith('http')) return redirectPath;
    return `${window.location.origin}${redirectPath ?? ''}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isResettingPassword && !email.trim()) return;
    if (!isForgotPassword && !isResettingPassword && !password) return;
    
    setError('');
    setLoading(true);

    try {
      if (isResettingPassword) {
        if (!password || password.length < 6) {
          setError('密碼長度至少需要 6 個字元');
          setLoading(false);
          return;
        }
        const { error: err } = await supabase.auth.updateUser({ password });
        if (err) throw err;
        setError('✅ 密碼已成功更新！請使用新密碼重新登入。');
        setTimeout(() => {
          setIsResettingPassword(false);
          setIsLogin(true);
          setError('');
        }, 2000);
        setLoading(false);
        return;
      }

      if (isForgotPassword) {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: getRedirectUrl(),
        });
        if (err) throw err;
        setError('✅ 密碼重置信件已發送！請去信箱點擊連結。');
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
        if (onLoginSuccess && data.user) onLoginSuccess(data.user);
        onClose();
      } else {
        const { data, error: err } = await supabase.auth.signUp({ 
          email: email.trim(), 
          password,
          options: { data: { display_name: email.trim().split('@')[0] } }
        });
        if (err) throw err;
        
        if (data.user) {
            // 紀錄訪客
          await supabase.from('visitor_logs').insert({
            action_type: 'user_register',
            details: {
              email: email.trim(),
              userName: email.trim().split('@')[0],
              user_id: data.user.id,
              created_at: new Date().toISOString()
            }
          });
          if (data.session) {
            if (onLoginSuccess) onLoginSuccess(data.user);
            onClose();
          } else {
            setError('✉️ 註冊成功！請去信箱點擊認證信連結，再回來登入。');
          }
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      // 翻譯常見錯誤訊息
      let msg = error.message || '發生未知錯誤，請重試';
      if (msg.includes('Invalid login credentials')) msg = '❌ 帳號或密碼錯誤。';
      if (msg.includes('User already registered')) msg = '🚫 這個帳號已經被註冊過了！';
      if (msg.includes('Password should be at least')) msg = '密碼長度至少需要 6 個字元';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'twitter' | 'x') => {
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: provider === 'twitter' ? 'x' : provider,
        options: {
          redirectTo: getRedirectUrl(),
        }
      });
      if (err) throw err;
    } catch (err: unknown) {
      setError((err as Error).message || `${provider} 登入發生錯誤`);
    }
  };



  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 border border-[#D1C6B4]/30 relative animate-slide-up max-h-[90vh] overflow-y-auto no-scrollbar">
        <button onClick={onClose} className="absolute top-5 right-5 text-[#4A4238]/40 hover:text-[#4A4238] font-bold">✕</button>
        <h2 className="text-2xl font-bold text-center text-[#4A4238] mb-2">
          {isResettingPassword ? '設定新密碼' : isForgotPassword ? '重設密碼' : isLogin ? '登入 KinkFlow' : '註冊完整帳號'}
        </h2>
        {!isResettingPassword && !isForgotPassword && !isLogin && (
          <p className="text-xs text-center text-[#4A4238]/60 mb-6 font-medium tracking-wide">
            註冊即可獲得專屬<span className="text-[#1DA1F2]">藍鳥認證</span>標誌，解鎖所有社群互動功能！
          </p>
        )}
        {!isForgotPassword && isLogin && (
          <p className="text-xs text-center text-[#4A4238]/60 mb-6 font-medium tracking-wide">
            歡迎回來！登入後繼續你的探索旅程。
          </p>
        )}
        {isForgotPassword && (
          <p className="text-xs text-center text-[#4A4238]/60 mb-6 font-medium tracking-wide">
            請輸入您註冊時使用的 Email，我們將發送重置連結給您。
          </p>
        )}
        {isResettingPassword && (
          <p className="text-xs text-center text-[#4A4238]/60 mb-6 font-medium tracking-wide">
            請輸入您要設定的新密碼。
          </p>
        )}
        
        {error && <div className="mb-4 text-xs text-[#E08A8A] bg-[#E08A8A]/10 p-3 rounded-xl border border-[#E08A8A]/30 font-bold">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isResettingPassword && (
            <div>
              <label className="block text-xs font-bold text-[#4A4238]/70 mb-1">Email 信箱</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required={!isResettingPassword} placeholder="請輸入 Email"
                className="w-full bg-[#FDFBF7] border border-[#D1C6B4]/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C5D4B6] transition-colors" />
            </div>
          )}
          {!isForgotPassword && (
            <div>
              <label className="block text-xs font-bold text-[#4A4238]/70 mb-1">{isResettingPassword ? '新密碼' : '密碼'}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="至少 6 個字元"
                className="w-full bg-[#FDFBF7] border border-[#D1C6B4]/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C5D4B6] transition-colors" />
            </div>
          )}
          
          <button type="submit" disabled={loading}
            className="w-full bg-[#4A4238] text-white font-bold rounded-xl py-3.5 mt-2 hover:bg-[#4A4238]/80 transition-colors disabled:opacity-50 shadow-sm">
            {loading ? '處理中...' : isResettingPassword ? '確認修改密碼' : isForgotPassword ? '發送重設密碼信件' : isLogin ? '帳號密碼登入' : '註冊帳號'}
          </button>
        </form>

        <div className="mt-6 mb-6 flex items-center justify-between">
          <div className="h-px bg-[#D1C6B4]/30 flex-1"></div>
          <span className="text-xs text-[#4A4238]/40 px-3 font-bold tracking-widest">或使用社群登入</span>
          <div className="h-px bg-[#D1C6B4]/30 flex-1"></div>
        </div>

        <div className="space-y-3">
          <button type="button" onClick={() => handleOAuth('google')}
            className="w-full bg-white border border-[#D1C6B4]/60 text-[#4A4238] font-bold rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors shadow-sm text-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google 登入
          </button>
          
          <button type="button" onClick={() => handleOAuth('twitter')}
            className="w-full bg-[#1DA1F2] text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-[#1DA1F2]/80 transition-colors shadow-sm text-sm">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
            Twitter (X) 登入
          </button>

        </div>
        
        <div className="mt-6 text-center text-sm text-[#4A4238]/60 flex flex-col gap-2">
          {!isForgotPassword && !isResettingPassword && isLogin && (
            <button type="button" onClick={() => { setIsForgotPassword(true); setError(''); }} className="font-bold text-[#4A4238]/50 hover:text-[#4A4238] transition-colors">
              忘記密碼了？
            </button>
          )}
          <div>
            {isForgotPassword ? '記起密碼了？' : isLogin ? '還沒有帳號嗎？' : '已經有帳號了？'}{' '}
            <button type="button" onClick={() => { 
              if (isForgotPassword) {
                setIsForgotPassword(false);
                setIsLogin(true);
              } else {
                setIsLogin(!isLogin);
              }
              setError(''); 
            }} className="font-bold text-[#C5D4B6] hover:underline">
              {isForgotPassword ? '返回登入' : isLogin ? '立即註冊' : '登入現有帳號'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
