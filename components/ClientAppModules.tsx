'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { AppData, GraphLink, GraphNode } from '@/lib/types';
import ErrorBoundary from '@/components/ErrorBoundary';
import GraphView from '@/components/GraphView';
import QuizView from '@/components/QuizView';
import ArticleFeature from '@/components/ArticleFeature';
import ForumFeature from '@/components/ForumFeature';

type ClientAppModulesProps = {
  activeTab: 'graph' | 'quiz' | 'articles' | 'forum';
  quizConfig: unknown;
  nodesData: GraphNode[];
  linksData: GraphLink[];
  defaultGraphNodes: GraphNode[];
  selectedNode: GraphNode | null;
  handleNodeClick: (node: GraphNode | null, postId?: string) => void;
  closeDrawer: () => void;
  userName: string;
  isGuest: boolean;
  appData: AppData;
  setAppData: Dispatch<SetStateAction<AppData>>;
  showToast: (message: string) => void;
  onOpenIframe: (url: string | null) => void;
  targetPostId: string | null;
  onOpenArticle: (title: string, content: string) => void;
  onOpenForumPost: (postId: string) => void;
  onOpenForum: () => void;
  targetForumPostId: string | null;
  onForumPostOpened: () => void;
  goBack: () => void;
  canGoBack: boolean;
  initialLobbyTab?: 'info' | 'hot' | 'stats' | 'board';
  userId: string | null;
  onBackToNode: (nodeId: string) => void;
  onCancelToGraph: () => void;
};

export default function ClientAppModules({
  activeTab,
  quizConfig,
  nodesData,
  linksData,
  defaultGraphNodes,
  selectedNode,
  handleNodeClick,
  closeDrawer,
  userName,
  isGuest,
  appData,
  setAppData,
  showToast,
  onOpenIframe,
  targetPostId,
  onOpenArticle,
  onOpenForumPost,
  onOpenForum,
  targetForumPostId,
  onForumPostOpened,
  goBack,
  canGoBack,
  initialLobbyTab,
  userId,
  onBackToNode,
  onCancelToGraph,
}: ClientAppModulesProps) {
  const effectiveNodes = nodesData.length > 0 ? nodesData : defaultGraphNodes;

  return <>
    {activeTab === 'graph' && (
      <ErrorBoundary moduleName="網路圖探索">
        <GraphView
          onNodeClick={handleNodeClick}
          selectedNode={selectedNode}
          closeDrawer={closeDrawer}
          userName={userName}
          isGuest={isGuest}
          appData={appData}
          setAppData={setAppData}
          showToast={showToast}
          onOpenIframe={onOpenIframe}
          targetPostId={targetPostId}
          onOpenArticle={onOpenArticle}
          onOpenForumPost={onOpenForumPost}
          onOpenForum={onOpenForum}
          nodesData={effectiveNodes}
          linksData={linksData}
          goBack={goBack}
          canGoBack={canGoBack}
          initialLobbyTab={initialLobbyTab}
        />
      </ErrorBoundary>
    )}
    {activeTab === 'quiz' && (
      <ErrorBoundary moduleName="性向測驗">
        <QuizView showToast={showToast} userName={userName} onCancel={onCancelToGraph} quizConfig={quizConfig} />
      </ErrorBoundary>
    )}
    {activeTab === 'articles' && (
      <ErrorBoundary moduleName="專題誌">
        <ArticleFeature nodesData={effectiveNodes} isMember={!isGuest && Boolean(userId)} onBackToNode={onBackToNode} />
      </ErrorBoundary>
    )}
    {activeTab === 'forum' && (
      <ErrorBoundary moduleName="討論版">
        <ForumFeature nodesData={effectiveNodes} isMember={!isGuest && Boolean(userId)} currentUserId={userId} initialPostId={targetForumPostId} onInitialPostOpened={onForumPostOpened} />
      </ErrorBoundary>
    )}
  </>;
}
