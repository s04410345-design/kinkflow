'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchAdminReports, resolveAdminReport, type AdminReport } from '@/lib/data/admin';

type ResolutionAction = 'none' | 'warn' | 'hide_content' | 'delete_content' | 'restore_content';

function formatDate(value: string | null | undefined): string {
  if (!value) return '日期未提供';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '日期未提供' : date.toLocaleString('zh-TW');
}

function statusLabel(status: string): string {
  if (status === 'resolved') return '已處理';
  if (status === 'dismissed') return '已駁回';
  return '待處理';
}

function categoryLabel(category: string | null | undefined): string {
  const labels: Record<string, string> = {
    spam: '垃圾訊息或廣告',
    harassment: '騷擾或霸凌',
    safety: '安全風險或危險內容',
    privacy: '侵犯隱私',
    illegal: '違法內容',
    hate: '仇恨或歧視',
    self_harm: '自傷相關風險',
    misinformation: '明顯錯誤資訊',
    other: '其他',
  };
  return labels[category || ''] || category || '未分類';
}

function actionLabel(action: string | null | undefined): string {
  const labels: Record<string, string> = { none: '未指定', warn: '提醒作者', hide_content: '隱藏內容', delete_content: '刪除內容', restore_content: '恢復內容' };
  return labels[action || 'none'] || action || '未指定';
}

export default function ReportReviewPanel({ onMessage }: { onMessage: (message: string) => void }) {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resolutionAction, setResolutionAction] = useState<ResolutionAction>('none');
  const [adminNote, setAdminNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReports(await fetchAdminReports());
    } catch {
      onMessage('讀取檢舉紀錄失敗，請確認資料庫權限或 migration 是否已套用。');
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  useEffect(() => { void load(); }, [load]);

  const resolve = async (report: AdminReport, status: 'resolved' | 'dismissed') => {
    setBusyId(report.id);
    const result = await resolveAdminReport(report.id, status, status === 'dismissed' ? 'none' : resolutionAction, adminNote);
    if (!result.ok) onMessage(result.message || '檢舉處理失敗。');
    else {
      onMessage(status === 'resolved' ? '檢舉已標記為已處理。' : '檢舉已標記為駁回。');
      setAdminNote('');
      setResolutionAction('none');
      await load();
    }
    setBusyId(null);
  };

  return <section className="rounded-3xl border border-[#D1C6B4]/40 bg-white/80 p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#A27B21]">Report Review</p><h2 className="mt-1 text-2xl font-bold">檢舉審核</h2><p className="mt-2 text-sm text-[#4A4238]/65">查看檢舉分類、處理內容，並保留管理員處理紀錄。</p></div><button type="button" onClick={() => void load()} disabled={loading} className="rounded-xl border border-[#D1C6B4]/60 px-4 py-2 text-sm font-bold disabled:opacity-50">重新整理</button></div>{loading ? <p className="py-12 text-center text-sm text-[#4A4238]/50">讀取檢舉中…</p> : reports.length === 0 ? <p className="py-12 text-center text-sm text-[#4A4238]/50">目前沒有檢舉紀錄。</p> : <div className="mt-6 space-y-4">{reports.map((report) => <article key={report.id} className="rounded-2xl border border-[#D1C6B4]/45 bg-[#FDFBF7] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{report.target_type === 'forum_comment' ? '論壇留言' : '論壇文章'} · {report.target_id}</p><p className="mt-1 text-xs text-[#4A4238]/55">送出時間：{formatDate(report.created_at)} · 分類：{categoryLabel(report.category)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${report.status === 'resolved' ? 'bg-[#EEF4EA] text-[#47633C]' : report.status === 'dismissed' ? 'bg-[#F1F5F9] text-[#64748B]' : 'bg-[#FFF4C8] text-[#6B5310]'}`}>{statusLabel(report.status)}</span></div><p className="mt-4 whitespace-pre-wrap rounded-xl bg-white p-4 text-sm leading-6 text-[#4A4238]/80"><strong>補充說明：</strong>{report.details || report.reason || '沒有提供說明。'}</p>{(report.resolved_action || report.admin_note) && <p className="mt-3 rounded-xl bg-[#F1F5F9] p-4 text-sm leading-6 text-[#475569]">處理動作：{actionLabel(report.resolved_action)}{report.admin_note ? ` · ${report.admin_note}` : ''}</p>}{report.status !== 'resolved' && report.status !== 'dismissed' && <div className="mt-3 border-t border-[#D1C6B4]/40 pt-3"><div className="flex flex-col gap-2 sm:flex-row"><select value={resolutionAction} onChange={(event) => setResolutionAction(event.target.value as ResolutionAction)} className="rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm"><option value="none">不變更內容</option><option value="warn">提醒作者</option><option value="hide_content">隱藏內容</option><option value="delete_content">刪除內容</option></select><input value={adminNote} onChange={(event) => setAdminNote(event.target.value)} maxLength={1000} placeholder="管理員備註（選填）" className="min-w-0 flex-1 rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm" /></div><div className="mt-3 flex gap-2"><button type="button" onClick={() => void resolve(report, 'resolved')} disabled={busyId === report.id} className="rounded-xl bg-[#47633C] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busyId === report.id ? '處理中…' : '標記已處理'}</button><button type="button" onClick={() => void resolve(report, 'dismissed')} disabled={busyId === report.id} className="rounded-xl border border-[#CBD5E1] px-4 py-2 text-sm font-bold text-[#475569] disabled:opacity-50">駁回</button></div></div>}</article>)}</div>}</section>;
}
