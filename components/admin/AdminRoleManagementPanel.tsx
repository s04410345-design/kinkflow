"use client";

import { useAdminRoles } from '@/hooks/useAdminRoles';

interface AdminRoleManagementPanelProps {
  enabled: boolean;
  currentAdminId?: string | null;
  onMessage?: (message: string) => void;
}

export default function AdminRoleManagementPanel({ enabled, currentAdminId, onMessage }: AdminRoleManagementPanelProps) {
  const {
    admins,
    emailOrUserId,
    setEmailOrUserId,
    roleLevel,
    setRoleLevel,
    isLoading,
    error,
    save,
    remove,
  } = useAdminRoles(enabled);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await save();
    if (result.ok) onMessage?.('✅ 管理員權限更新成功');
    else onMessage?.(`❌ 新增管理員失敗：${result.message || ''}`);
  };

  const handleRemove = async (target: string) => {
    if (target === currentAdminId) {
      window.alert('您不能移除自己的權限！');
      return;
    }
    if (!window.confirm(`確定要移除 ${target} 的管理員權限嗎？`)) return;
    const result = await remove(target);
    if (result.ok) onMessage?.('✅ 管理員權限已移除');
    else onMessage?.(`❌ 移除管理員失敗：${result.message || ''}`);
  };

  if (!enabled) return null;

  return (
    <div className="bg-white/70 rounded-2xl border border-[#D1C6B4]/30 shadow-sm p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-2">🔑 管理員權限設定 (RBAC)</h2>
      <p className="text-sm text-[#4A4238]/60 mb-6">新增或移除管理員，並設定其權限等級。Level 1 擁有最高權限，Level 2 負責內容編輯，Level 3 僅能觀看無法儲存。</p>

      <form onSubmit={handleSave} className="flex flex-col sm:flex-row gap-4 items-end mb-8 bg-[#FDFBF7] p-4 rounded-xl border border-[#D1C6B4]/30">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold mb-1">User ID（UUID）</label>
          <input type="text" required value={emailOrUserId} onChange={(event) => setEmailOrUserId(event.target.value)} placeholder="新管理員 User ID（UUID）" className="w-full px-4 py-2.5 rounded-xl border border-[#D1C6B4]/50 focus:border-[#C5D4B6] focus:ring-1 focus:ring-[#C5D4B6] outline-none text-sm bg-white" />
        </div>
        <div className="w-full sm:w-32 shrink-0">
          <label className="block text-xs font-bold mb-1">權限等級</label>
          <select value={roleLevel} onChange={(event) => setRoleLevel(Number(event.target.value))} className="w-full px-4 py-2.5 rounded-xl border border-[#D1C6B4]/50 focus:border-[#C5D4B6] focus:ring-1 focus:ring-[#C5D4B6] outline-none text-sm bg-white">
            <option value={1}>Level 1 (最高)</option>
            <option value={2}>Level 2 (編輯)</option>
            <option value={3}>Level 3 (觀看)</option>
          </select>
        </div>
        <button type="submit" disabled={isLoading} className="w-full sm:w-auto px-6 py-2.5 bg-[#4A4238] text-white font-bold rounded-xl hover:bg-[#4A4238]/80 transition-colors disabled:opacity-50">
          {isLoading ? '處理中...' : '+ 新增/更新'}
        </button>
      </form>

      {error && <p className="mb-4 rounded-xl border border-[#E8C5C8] bg-[#E8C5C8]/20 px-4 py-3 text-sm text-[#8D4242]">{error}</p>}

      {isLoading && admins.length === 0 ? (
        <div className="text-center py-10 text-[#4A4238]/40">讀取中...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#D1C6B4]/30">
                <th className="pb-3 text-sm font-bold text-[#4A4238]/70">管理員 Email／UUID</th>
                <th className="pb-3 text-sm font-bold text-[#4A4238]/70">等級</th>
                <th className="pb-3 text-sm font-bold text-[#4A4238]/70">加入時間</th>
                <th className="pb-3 text-sm font-bold text-[#4A4238]/70 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D1C6B4]/10">
              {admins.map((admin) => (
                <tr key={admin.user_id} className="hover:bg-[#FDFBF7]">
                  <td className="py-3 text-sm font-medium">{admin.user_id} {admin.user_id === currentAdminId && <span className="text-[10px] bg-[#E8C5C8]/30 px-2 py-0.5 rounded-full ml-2">You</span>}</td>
                  <td className="py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${admin.role_level === 1 ? 'bg-[#E8C5C8]/30 text-[#E08A8A]' : admin.role_level === 2 ? 'bg-[#C5D4B6]/30 text-[#4A7238]' : 'bg-[#B6C4D4]/30 text-[#4A4238]'}`}>
                      Level {admin.role_level}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-[#4A4238]/50">{new Date(admin.created_at).toLocaleString('zh-TW')}</td>
                  <td className="py-3 text-right">
                    {admin.user_id !== currentAdminId && (
                      <button onClick={() => void handleRemove(admin.user_id)} disabled={isLoading} className="text-xs text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-xl transition-colors border border-red-100 disabled:opacity-50">
                        移除權限
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
