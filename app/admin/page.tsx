/*
 * KinkFlow 管理後台入口。
 * 這一頁只負責：驗證管理員、切換模組、組合各個管理面板。
 * CMS 狀態與寫入流程集中在 useAdminWorkspace，避免後台入口變成無法拆卸的巨型元件。
 */
"use client";

import { useEffect, useState } from 'react';
import AdminRoleManagementPanel from '@/components/admin/AdminRoleManagementPanel';
import AuthorReviewPanel from '@/components/admin/AuthorReviewPanel';
import AnalyticsDashboardPanel from '@/components/admin/AnalyticsDashboardPanel';
import DiscussionManagementPanel from '@/components/admin/DiscussionManagementPanel';
import ReportReviewPanel from '@/components/admin/ReportReviewPanel';
import MemberManagementPanel from '@/components/admin/MemberManagementPanel';
import NodeContentEditor from '@/components/admin/NodeContentEditor';
import QuizContentEditor from '@/components/admin/QuizContentEditor';
import ArticleContentEditor from '@/components/admin/ArticleContentEditor';
import { MINDMAP_V2_NODES, validateMindmapNodes } from '@/lib/mindmap';
import VisitorLogsPanel from '@/components/admin/VisitorLogsPanel';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAdminWorkspace } from '@/hooks/useAdminWorkspace';

type AdminTab = 'analytics' | 'cms_nodes' | 'cms_quiz' | 'cms_articles' | 'users' | 'discussions' | 'reports' | 'comments' | 'authors' | 'admins';

export default function AdminDashboard() {
  const { isAuth, adminLevel, adminEmail, authError, isChecking, logout } = useAdminAuth();
  const workspace = useAdminWorkspace(adminLevel, isAuth);
  const { fetchStats } = workspace;
  const articleNodesValidation = validateMindmapNodes(workspace.mindmapJson);
  const articleNodes = articleNodesValidation.ok ? articleNodesValidation.nodes : MINDMAP_V2_NODES;
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');

  useEffect(() => {
    if (isAuth && activeTab === 'comments') void fetchStats();
  }, [activeTab, isAuth, fetchStats]);

  const tabButton = (id: AdminTab, label: string) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${activeTab === id
        ? 'bg-[#4A4238] text-white border-[#4A4238] shadow-md'
        : 'bg-white/60 text-[#4A4238] border-[#D1C6B4]/40 hover:border-[#4A4238]/40'}`}
    >
      {label}
    </button>
  );

  if (isChecking) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#FDFBF7', color: '#4A4238' }}>
        正在確認後台權限…
      </div>
    );
  }

  if (!isAuth) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center p-6" style={{ background: '#FDFBF7', color: '#4A4238' }}>
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-[#D1C6B4]/30 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold mb-2">後台管理登入</h1>
          <p className="text-[#4A4238]/60 text-sm mb-8">請使用具備管理員權限的帳號登入</p>
          <button
            type="button"
            onClick={() => { window.location.href = '/admin/login'; }}
            className="w-full py-3 bg-[#4A4238] text-white font-bold rounded-xl hover:bg-[#4A4238]/80 transition-all shadow-md"
          >
            前往後台登入
          </button>
          {authError && <p className="text-[#E08A8A] text-sm mt-4 font-bold">{authError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans" style={{ background: '#FDFBF7', color: '#4A4238' }}>
      <div className="sticky top-0 z-20 border-b border-[#D1C6B4]/30 bg-[#FDFBF7]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">KinkFlow 管理後台</h1>
            <p className="text-xs text-[#4A4238]/50 mt-0.5 flex items-center gap-2">
              內容管理 · 數據分析 · 用戶紀錄
              <span className="bg-[#C5D4B6]/30 text-[#4A7238] px-2 py-0.5 rounded-full text-[10px] font-bold">Level {adminLevel}</span>
              <span className="hidden sm:inline">· {adminEmail}</span>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button type="button" onClick={() => void logout()} className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg font-bold border border-transparent hover:border-red-100 transition-colors mr-2">
              登出
            </button>
            {tabButton('analytics', '統計數據中心')}
            {tabButton('cms_nodes', '節點內容編輯')}
            {tabButton('cms_quiz', '測驗系統編輯')}
            {tabButton('cms_articles', '專題誌管理')}
            {tabButton('users', '會員管理')}
            {tabButton('discussions', '討論區與留言管理')}
            {tabButton('reports', '檢舉審核')}
            {tabButton('comments', '訪客與互動紀錄')}
            {tabButton('authors', '作者申請審核')}
            {adminLevel === 1 && tabButton('admins', '管理員設定')}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {workspace.message && (
          <div className={`mb-6 p-4 rounded-xl text-center text-sm font-medium border ${workspace.message.startsWith('✅')
            ? 'bg-[#C5D4B6]/20 border-[#C5D4B6]'
            : 'bg-[#E8C5C8]/20 border-[#E8C5C8]'}`}
          >
            {workspace.message}
          </div>
        )}

        {activeTab === 'analytics' && <AnalyticsDashboardPanel />}

        {activeTab === 'cms_nodes' && (workspace.loading ? (
          <div className="text-center py-20 text-[#4A4238]/40">讀取資料中...</div>
        ) : (
          <NodeContentEditor
            mindmapJson={workspace.mindmapJson}
            setMindmapJson={workspace.setMindmapJson}
            onSave={workspace.handleSave}
            onPublish={workspace.publishNodes}
            saving={workspace.saving}
            nodeImages={workspace.nodeImages}
            setNodeImages={workspace.setNodeImages}
            uploadingState={workspace.uploadingState}
            handleFileUpload={workspace.handleFileUpload}
            preferredNodeId="bdsm"
          />
        ))}

        {activeTab === 'cms_quiz' && (workspace.loading ? (
          <div className="text-center py-20 text-[#4A4238]/40">讀取資料中...</div>
        ) : (
          <QuizContentEditor
            quizJson={workspace.quizJson}
            setQuizJson={workspace.setQuizJson}
            onSave={workspace.handleSave}
            onPublish={workspace.publishQuiz}
            saving={workspace.saving}
          />
        ))}

        {activeTab === 'cms_articles' && (
          <ArticleContentEditor
            nodesData={articleNodes}
            adminLevel={adminLevel}
            onMessage={workspace.setMessage}
          />
        )}

        {activeTab === 'discussions' && <DiscussionManagementPanel />}
        {activeTab === 'reports' && <ReportReviewPanel onMessage={workspace.setMessage} />}
        {activeTab === 'comments' && (
          <VisitorLogsPanel
            logs={workspace.logs}
            discussions={workspace.discussions}
            nodeNameMap={workspace.nodeNameMap}
            onRefresh={workspace.fetchStats}
          />
        )}
        {activeTab === 'users' && <MemberManagementPanel />}
        {activeTab === 'authors' && <AuthorReviewPanel onMessage={workspace.setMessage} />}
        {activeTab === 'admins' && adminLevel === 1 && (
          <AdminRoleManagementPanel
            enabled={isAuth && adminLevel === 1}
            currentAdminId={adminEmail}
            onMessage={workspace.setMessage}
          />
        )}
      </main>
    </div>
  );
}
