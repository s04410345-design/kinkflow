'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchAdminReports, resolveAdminReport, type AdminReport } from '@/lib/data/admin';

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

export default function ReportReviewPanel({ onMessage }: { onMessage: (message: string) => void }) {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReports(await fetchAdminReports());
    } catch {
      onMessage('讀取檢舉紀錄失敗，請確認資料庫權限。');
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  useEffect(() => { void load(); }, [load]);

  const resolve = async (report: AdminReport, status: 'resolved' | 'dismissed') => {
    setBusyId(report.id);
    const result = await resolveAdminReport(report.id, status);
    if (!result.ok) onMessage(result.message || '檢舉處理失敗。');
    else {
      onMessage(status === 'resolved' ? '檢舉已標記為已處理。' : '檢舉已標記為駁回。');
      await load();
    }
    setBusyId(null);
  };

  return <section className="rounded-3xl border border-[#D1C6B4]/40 bg-white/80 p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#A27B21]">Report Review</p><h2 className="mt-1 text-2xl font-bold">檢舉審核</h2><p className="mt-2 text-sm text-[#4A4238]/65">查看會員針對論壇文章或留言送出的檢舉，並留下處理結果。</p></div><button type="button" onClick={() => void load()} disabled={loading} className="rounded-xl border border-[#D1C6B4]/60 px-4 py-2 text-sm font-bold disabled:opacity-50">重新整理</button></div>{loading ? <p className="py-12 text-center text-sm text-[#4A4238]/50">讀取檢舉中…</p> : reports.length === 0 ? <p className="py-12 text-center text-sm text-[#4A4238]/50">目前沒有檢舉紀錄。</p> : <div className="mt-6 space-y-4">{reports.map((report) => <article key={report.id} className="rounded-2xl border border-[#D1C6B4]/45 bg-[#FDFBF7] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{report.target_type === 'forum_comment' ? '論壇留言' : '論壇文章'} · {report.target_id}</p><p className="mt-1 text-xs text-[#4A4238]/55">送出時間：{formatDate(report.created_at)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${report.status === 'resolved' ? 'bg-[#EEF4EA] text-[#47633C]' : report.status === 'dismissed' ? 'bg-[#F1F5F9] text-[#64748B]' : 'bg-[#FFF4C8] text-[#6B5310]'}`}>{statusLabel(report.status)}</span></div><p className="mt-4 whitespace-pre-wrap rounded-xl bg-white p-4 text-sm leading-6 text-[#4A4238]/80">{report.reason || '沒有提供原因。'}</p>{report.status !== 'resolved' && report.status !== 'dismissed' && <div className="mt-3 flex gap-2"><button type="button" onClick={() => void resolve(report, 'resolved')} disabled={busyId === report.id} className="rounded-xl bg-[#47633C] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">標記已處理</button><button type="button" onClick={() => void resolve(report, 'dismissed')} disabled={busyId === report.id} className="rounded-xl border border-[#CBD5E1] px-4 py-2 text-sm font-bold text-[#475569] disabled:opacity-50">駁回</button></div>}</article>)}</div>}</section>;
}
