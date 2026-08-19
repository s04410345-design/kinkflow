import React, { useEffect } from 'react';
import MarkdownPreview from '@/components/MarkdownPreview';

interface ArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  markdownContent: string;
}

export default function ArticleModal({ isOpen, onClose, title, markdownContent }: ArticleModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300 opacity-100`}>
      {/* 模糊背景 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* 彈出視窗 */}
      <div className={`relative bg-[#FDFBF7] w-[95vw] max-w-3xl h-[90vh] md:h-[85vh] rounded-2xl shadow-2xl flex flex-col transform transition-transform duration-300 overflow-hidden border border-[#D1C6B4]/30 scale-100 translate-y-0`}>
        
        {/* 頂部標題與關閉按鈕 */}
        <div className="flex items-center justify-between p-5 border-b border-[#D1C6B4]/20 bg-white/80 shrink-0 sticky top-0 z-10 backdrop-blur-md">
          <h2 className="text-xl md:text-2xl font-bold text-[#4A4238]">{title}</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#E8C5C8]/20 text-[#4A4238] hover:bg-[#E8C5C8] hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        
        {/* 文章內容區塊 */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <MarkdownPreview markdown={markdownContent} />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #D1C6B4;
          border-radius: 20px;
        }
      `}} />
    </div>
  );
}
