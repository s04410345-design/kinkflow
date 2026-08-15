'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchAuthorApplications, reviewAuthorApplication, type AuthorApplication } from '@/lib/data/admin';

function formatDate(value: string | null | undefined): string {
  if (!value) return '日期未提供';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '日期未提供' : date.toLocaleString('zh-TW');
}

export default function AuthorReviewPanel({ onMessage }: { onMessage: (message: string) => void }) {
  const [applications, setApplications] = useState<AuthorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try { setApplications(await fetchAuthorApplications()); }
    catch { onMessage('讀取認證作者申請失敗，請確認管理員資料庫權限。'); }
    finally { setLoading(false); }
  }, [onMessage]);

  useEffect(() => { void load(); }, [load]);

  const review = async (application: AuthorApplication, status: 'approved' | 'rejected') => {
    setBusyUserId(application.user_id);
    const result = await reviewAuthorApplication(application.user_id, status, notes[application.user_id] || '');
    onMessage(result.ok ? (status === 'approved' ? '作者申請已核准。' : '作者申請已退回。') : (result.message || '審核失敗。'));
    if (result.ok) await load();
    setBusyUserId(null);
  };

  return <section className="rounded-3xl border border-[#D1C6B4]/40 bg-white/80 p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#A27B21]">Author Review</p><h2 className="mt-1 text-2xl font-bold">認證作者申請</h2><p className="mt-2 text-sm text-[#4A4238]/65">核准後，會員才可以建立與發布專題誌長文。</p></div><button type="button" onClick={() => void load()} className="rounded-xl border border-[#D1C6B4]/60 px-4 py-2 text-sm font-bold">重新整理</button></div>{loading ? <p className="py-12 text-center text-sm text-[#4A4238]/50">讀取申請中…</p> : applications.length === 0 ? <p className="py-12 text-center text-sm text-[#4A4238]/50">目前沒有申請紀錄。</p> : <div className="mt-6 space-y-4">{applications.map((application) => <article key={application.user_id} className="rounded-2xl border border-[#D1C6B4]/45 bg-[#FDFBF7] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">會員 ID：{application.user_id}</p><p className="mt-1 text-xs text-[#4A4238]/55">申請時間：{formatDate(application.created_at)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${application.status === 'approved' ? 'bg-[#EEF4EA] text-[#47633C]' : application.status === 'rejected' ? 'bg-[#FCE7F3] text-[#9D174D]' : 'bg-[#FFF4C8] text-[#6B5310]'}`}>{application.status === 'approved' ? '已核准' : application.status === 'rejected' ? '已退回' : '待審核'}</span></div><p className="mt-4 whitespace-pre-wrap rounded-xl bg-white p-4 text-sm leading-6 text-[#4A4238]/80">{application.application_text || '沒有申請說明。'}</p>{application.status === 'pending' && <><textarea value={notes[application.user_id] || ''} onChange={(e) => setNotes((current) => ({ ...current, [application.user_id]: e.target.value }))} maxLength={1000} placeholder="審核備註（可選，最多 1,000 字）" className="mt-3 min-h-20 w-full rounded-xl border border-[#D1C6B4]/60 bg-white p-3 text-sm" /><div className="mt-3 flex gap-2"><button type="button" onClick={() => void review(application, 'approved')} disabled={busyUserId === application.user_id} className="rounded-xl bg-[#47633C] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">核准</button><button type="button" onClick={() => void review(application, 'rejected')} disabled={busyUserId === application.user_id} className="rounded-xl bg-[#9D174D] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">退回</button></div></>}</article>)}</div>}</section>;
}
