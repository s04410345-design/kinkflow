"use client";

import { useState, useEffect } from 'react';
import { SafeStorage, logToSupabase } from '@/lib/constants';

export default function AgreementModal({ onAgree }: { onAgree: () => void }) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const agreed = SafeStorage.get('kinkflow_agreed_18_v3');
    if (!agreed) {
      setIsVisible(true);
    } else {
      onAgree();
    }
  }, [onAgree]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop <= e.currentTarget.clientHeight + 20;
    if (bottom) setHasScrolledToBottom(true);
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    setIsSending(true);
    await logToSupabase('author_message', { message });
    setIsSending(false);
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setMessage('');
    }, 3000);
  };

  const handleAccept = () => {
    SafeStorage.set('kinkflow_agreed_18_v3', true);
    setIsVisible(false);
    onAgree();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white max-w-2xl w-full rounded-2xl shadow-xl border-2 border-[#E8C5C8] overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-[#E8C5C8]/30 bg-[#FDFBF7]">
          <h2 className="text-2xl font-bold text-[#E08A8A] text-center metallic-text">歡迎來到 KinkFlow</h2>
          <p className="text-center text-[#4A4238]/60 text-sm mt-2">進入前，請確認您同意我們的社群守則</p>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6 text-[#4A4238]/80 text-sm leading-relaxed" onScroll={handleScroll}>
          <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-100 flex gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <h3 className="font-bold mb-1">年齡限制與內容警告</h3>
              <p>本網站包含成人內容與 BDSM 相關探討。您必須<strong>年滿 18 歲 (或達當地法定成年年齡)</strong> 才能進入。若您未達法定年齡，請立即離開。</p>
            </div>
          </div>

          <section>
            <h3 className="text-[#E08A8A] font-bold text-lg mb-2">SSC 與 RACK 安全原則</h3>
            <p className="mb-2">本社群嚴格倡導並遵守以下核心原則：</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Safe, Sane, Consensual (SSC)</strong>：安全、理智、知情同意。所有的互動與實踐都必須在雙方清醒、理智且完全同意的基礎上進行。</li>
              <li><strong>Risk-Aware Consensual Kink (RACK)</strong>：知情同意且認知風險的特殊癖好。參與者必須充分了解實踐的潛在風險。</li>
            </ul>
          </section>

          <section>
            <h3 className="text-[#E08A8A] font-bold text-lg mb-2">社群禁止行為</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>嚴禁發布未成年色情、非自願流出或任何非法影像。</li>
              <li>嚴禁任何形式的買賣交易、詐騙、商業廣告與援交資訊。</li>
              <li>嚴禁騷擾他人、未經同意傳送私密部位照片。</li>
              <li>嚴禁鼓吹危及生命或造成永久性嚴重傷害之行為。</li>
            </ul>
          </section>

          <section className="bg-[#EFF6FF] p-4 rounded-xl border border-[#BFDBFE] shadow-xs my-2">
            <h3 className="text-[#1E40AF] font-black text-base mb-2 flex items-center gap-2" style={{ color: '#1E40AF' }}>🤖 AI 輔助建置聲明</h3>
            <p className="text-[#1E3A8A] font-bold text-xs leading-relaxed" style={{ color: '#1E3A8A' }}>
              本網站的系統架構、程式碼與部分內容，是由人工智慧 (AI) 輔助建置與生成。雖然我們致力於提供正確的資訊，但無法保證所有內容的絕對正確性。請在實踐任何行為前，務必自行查證並確保安全。
            </p>
          </section>

          <section>
            <h3 className="text-[#E08A8A] font-bold text-lg mb-3">✨ 來源出處與特別感謝</h3>
            <p className="mb-3">本專案的誕生，特別感謝以下協助者：</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a href="https://x.com/lingyang763" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-[#D1C6B4]/30 hover:border-[#E8C5C8] hover:bg-[#FDFBF7] transition-all group">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </div>
                <div>
                  <div className="text-xs text-gray-500">協力者</div>
                  <div className="font-bold text-[#4A4238] group-hover:text-blue-500 transition-colors">@lingyang763</div>
                </div>
              </a>
              <a href="https://x.com/LakeCattt" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-[#D1C6B4]/30 hover:border-[#E8C5C8] hover:bg-[#FDFBF7] transition-all group">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </div>
                <div>
                  <div className="text-xs text-gray-500">協力者</div>
                  <div className="font-bold text-[#4A4238] group-hover:text-blue-500 transition-colors">@LakeCattt</div>
                </div>
              </a>
              <a href="https://x.com/Akitas0608" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl border-2 border-[#E8C5C8]/50 hover:border-[#E08A8A] bg-[#FDFBF7] transition-all group sm:col-span-2">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E08A8A] to-[#D47A7A] flex items-center justify-center text-white text-xl font-bold shadow-sm">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </div>
                <div>
                  <div className="text-xs text-[#E08A8A] font-bold">網站作者</div>
                  <div className="font-bold text-lg text-[#4A4238] group-hover:text-[#E08A8A] transition-colors">@Akitas0608</div>
                  <div className="text-xs text-gray-500">點此前往作者的 Twitter (X) 主頁</div>
                </div>
              </a>
            </div>
          </section>

          <section className="bg-[#FDFBF7] p-5 rounded-xl border border-[#E8C5C8]/40 shadow-sm relative overflow-hidden mt-4">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#E08A8A]"></div>
            <h3 className="text-[#4A4238] font-bold text-lg mb-1">💌 給作者的話 / 意見回饋</h3>
            <p className="text-gray-500 text-xs mb-3">有任何建議、發現錯誤，或是想對作者說的話，都可以直接在這裡留言！</p>
            
            <div className="flex flex-col gap-2">
              <textarea 
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="寫下你想對作者說的話..."
                className="w-full h-24 p-3 rounded-lg border border-[#D1C6B4]/50 focus:outline-none focus:border-[#E08A8A] focus:ring-1 focus:ring-[#E08A8A] resize-none text-[#4A4238] bg-white transition-all"
                disabled={isSending || sent}
              />
              <div className="flex justify-between items-center mt-1">
                <span className={`text-sm font-bold ${sent ? 'text-green-500' : 'text-transparent'}`}>
                  ✓ 留言已成功送出，謝謝您的回饋！
                </span>
                <button 
                  onClick={handleSend}
                  disabled={!message.trim() || isSending || sent}
                  className={`px-5 py-2 rounded-lg font-bold transition-all shadow-sm ${
                    message.trim() && !isSending && !sent
                      ? 'bg-[#E08A8A] text-white hover:bg-[#D47A7A] active:scale-95' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isSending ? '傳送中...' : sent ? '已送出' : '送出留言'}
                </button>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[#E08A8A] font-bold text-lg mb-2">隱私與免責聲明</h3>
            <p>
              本網站僅提供資訊交流與屬性探索工具。對於使用者之間的私下互動或線下見面所產生的任何糾紛或損害，本平台概不負責。請保護好您的個人隱私，切勿輕易向陌生人提供真實姓名、地址或財務資訊。
            </p>
          </section>
        </div>

        <div className="p-6 bg-[#FDFBF7] border-t border-[#E8C5C8]/30 flex flex-col sm:flex-row justify-end gap-3">
          <button 
            onClick={() => window.location.href = 'https://google.com'}
            className="px-6 py-2.5 rounded-xl border border-[#4A4238]/20 text-[#4A4238] font-medium hover:bg-[#4A4238]/5 transition-colors"
          >
            我未滿 18 歲 / 拒絕
          </button>
          <button 
            onClick={handleAccept}
            disabled={!hasScrolledToBottom}
            className={`px-6 py-2.5 rounded-xl font-medium transition-all ${
              hasScrolledToBottom 
              ? 'bg-[#E08A8A] text-white hover:bg-[#D47A7A] shadow-md shadow-[#E08A8A]/20' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {hasScrolledToBottom ? '我已年滿 18 歲且同意遵守規則' : '請先閱讀完畢 (向下滑動)'}
          </button>
        </div>
      </div>
    </div>
  );
}
