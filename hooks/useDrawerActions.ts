import { useRef } from 'react';
import { createDiscussion, deleteDiscussionById, getCurrentUserId, notifyReply, persistNodeVote, updateDiscussion } from '@/lib/data/nodeInteractions';
import type { AppData, DiscussionPost, GraphNode, Reply, EmojiCount, VoteStats } from '@/lib/types';
import { logToSupabase } from '@/lib/constants';
import { VOTE_TYPES, type VoteType } from '@/lib/contentModel';

type DrawerActionParams = {
  node: GraphNode;
  dbKey: string;
  posts: DiscussionPost[];
  userName: string;
  isGuest: boolean;
  lobbyTab: 'info' | 'chat' | 'hot' | 'stats' | 'board';
  setAppData: (updater: AppData | ((prev: AppData) => AppData)) => void;
  showToast: (message: string) => void;
};

function cloneAppData(data: AppData): AppData {
  return JSON.parse(JSON.stringify(data)) as AppData;
}

export function useDrawerActions({ node, dbKey, posts, userName, isGuest, lobbyTab, setAppData, showToast }: DrawerActionParams) {
  const lastSubmitRef = useRef(0);

  const updatePostInDb = (postId: string | number, updates: Record<string, unknown>) => {
    void updateDiscussion(postId, updates).catch((error) => console.error('discussion update failed', error));
  };

  const addPost = async (text: string) => {
    if (Date.now() - lastSubmitRef.current < 500) return;
    if (isGuest && !(node.level === 0 && lobbyTab === 'chat')) {
      showToast('🔒 訪客僅能在即時聊天室發言，註冊完整帳號即可建立討論版！');
      return;
    }

    lastSubmitRef.current = Date.now();
    showToast('防洗版偵測中...');
    try {
      const res = await fetch('/api/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, author: userName }),
      });
      const data = (await res.json()) as { action?: string; message?: string };
      if (data.action === 'BLOCK') {
        showToast(data.message || '含有違規內容，已阻擋發布。');
        return;
      }
    } catch (error) {
      console.error('Moderation error:', error);
    }

    let newPost: DiscussionPost;
    try {
      newPost = await createDiscussion(dbKey, userName, text);
    } catch (error) {
      showToast(`❌ 發布失敗：${error instanceof Error ? error.message : '資料未返回'}`);
      return;
    }
    setAppData((prev) => {
      const next = cloneAppData(prev);
      if (!next.discussions[dbKey]) next.discussions[dbKey] = [];
      next.discussions[dbKey].push(newPost);
      return next;
    });
  };

  const handleDeletePost = async (postId: string | number, replyId?: string | number) => {
    try {
      if (replyId !== undefined) {
        const post = posts.find((item) => item.id === postId);
        if (!post) return;
        const newReplies = (post.replies || []).filter((reply: Reply) => reply.id !== replyId);
        updatePostInDb(postId, { replies: newReplies });
        setAppData((prev) => {
          const next = cloneAppData(prev);
          const postIndex = next.discussions[dbKey]?.findIndex((item) => item.id === postId) ?? -1;
          if (postIndex > -1) next.discussions[dbKey][postIndex].replies = newReplies;
          return next;
        });
      } else {
        await deleteDiscussionById(postId);
        setAppData((prev) => {
          const next = cloneAppData(prev);
          next.discussions[dbKey] = next.discussions[dbKey]?.filter((item) => item.id !== postId) || [];
          return next;
        });
      }
      showToast('🗑️ 留言已刪除');
    } catch (error) {
      console.error('discussion delete failed', error);
      showToast('❌ 刪除失敗');
    }
  };

  const addReply = (postId: string | number, text: string) => {
    if (Date.now() - lastSubmitRef.current < 500) return;
    if (isGuest && !(node.level === 0 && lobbyTab === 'chat')) {
      showToast('🔒 訪客僅能在即時聊天室發言，註冊完整帳號即可回覆討論版！');
      return;
    }
    lastSubmitRef.current = Date.now();

    setAppData((prev) => {
      const next = cloneAppData(prev);
      const post = next.discussions[dbKey]?.find((item) => item.id === postId);
      if (!post) return next;
      const replies = [...(post.replies || []), { id: Date.now() + Math.random(), author: userName, text, timestamp: Date.now(), upvotes: 0, emojis: [] }];
      post.replies = replies;
      updatePostInDb(postId, { replies });

      const targetAuthorName = post.author.replace(/ ☑️/g, '').replace(/ 👻/g, '').trim();
      const cleanCurrentName = userName.replace(/ ☑️/g, '').replace(/ 👻/g, '').trim();
      if (targetAuthorName && targetAuthorName !== cleanCurrentName) {
        void notifyReply(targetAuthorName, cleanCurrentName, text, node.id).catch((error) => console.error('reply notification failed', error));
      }
      return next;
    });
  };

  const toggleReplyUpvote = (postId: string | number, replyId: string | number) => {
    setAppData((prev) => {
      const next = cloneAppData(prev);
      const voted = Boolean(next.userEmojis?.[`reply_up_${replyId}`]);
      next.userEmojis = { ...(next.userEmojis || {}) };
      if (voted) delete next.userEmojis[`reply_up_${replyId}`];
      else next.userEmojis[`reply_up_${replyId}`] = true;
      for (const key of Object.keys(next.discussions)) {
        next.discussions[key] = next.discussions[key].map((post) => {
          if (post.id !== postId) return post;
          const replies = (post.replies || []).map((reply: Reply) => reply.id === replyId ? { ...reply, upvotes: Math.max(0, (reply.upvotes || 0) + (voted ? -1 : 1)) } : reply);
          updatePostInDb(postId, { replies });
          return { ...post, replies };
        });
      }
      return next;
    });
  };

  const addReplyEmoji = (postId: string | number, replyId: string | number, emoji: string) => {
    setAppData((prev) => {
      const next = cloneAppData(prev);
      next.userEmojis = { ...(next.userEmojis || {}) };
      const key = `reply_emoji_${replyId}_${emoji}`;
      const reacted = Boolean(next.userEmojis[key]);
      if (reacted) delete next.userEmojis[key];
      else next.userEmojis[key] = true;
      for (const discussionKey of Object.keys(next.discussions)) {
        next.discussions[discussionKey] = next.discussions[discussionKey].map((post) => {
          if (post.id !== postId) return post;
          const replies = (post.replies || []).map((reply: Reply) => {
            if (reply.id !== replyId) return reply;
            const emojis: EmojiCount[] = [...(reply.emojis || [])];
            const existing = emojis.find((item) => item.char === emoji);
            if (reacted) {
              if (existing) existing.count = Math.max(0, existing.count - 1);
            } else if (existing) existing.count += 1;
            else emojis.push({ char: emoji, count: 1 });
            return { ...reply, emojis: emojis.filter((item) => item.count > 0) };
          });
          updatePostInDb(postId, { replies });
          return { ...post, replies };
        });
      }
      return next;
    });
  };

  const toggleUpvote = (postId: string | number) => {
    setAppData((prev) => {
      const next = cloneAppData(prev);
      next.userUpvotes = { ...(next.userUpvotes || {}) };
      const voted = Boolean(next.userUpvotes[postId]);
      if (voted) delete next.userUpvotes[postId];
      else next.userUpvotes[postId] = true;
      for (const key of Object.keys(next.discussions)) {
        next.discussions[key] = next.discussions[key].map((post) => {
          if (post.id !== postId) return post;
          const upvotes = Math.max(0, post.upvotes + (voted ? -1 : 1));
          updatePostInDb(postId, { upvotes });
          return { ...post, upvotes };
        });
      }
      return next;
    });
  };

  const addEmoji = (postId: string | number, emoji: string) => {
    setAppData((prev) => {
      const next = cloneAppData(prev);
      next.userEmojis = { ...(next.userEmojis || {}) };
      const key = `${postId}_${emoji}`;
      const reacted = Boolean(next.userEmojis[key]);
      if (reacted) delete next.userEmojis[key];
      else next.userEmojis[key] = true;
      for (const discussionKey of Object.keys(next.discussions)) {
        next.discussions[discussionKey] = next.discussions[discussionKey].map((post) => {
          if (post.id !== postId) return post;
          const emojis = [...(post.emojis || [])];
          const existing = emojis.find((item) => item.char === emoji);
          if (reacted) {
            if (existing) existing.count = Math.max(0, existing.count - 1);
          } else if (existing) existing.count += 1;
          else emojis.push({ char: emoji, count: 1 });
          const finalEmojis = emojis.filter((item) => item.count > 0);
          updatePostInDb(postId, { emojis: finalEmojis });
          return { ...post, emojis: finalEmojis };
        });
      }
      return next;
    });
  };

  const castVote = async (voteType: string) => {
    if (!VOTE_TYPES.includes(voteType as VoteType)) {
      showToast('投票選項無效，請重新選擇。');
      return;
    }
    if (isGuest) {
      showToast('🔒 請註冊完整帳號以參與節點喜好投票！');
      return;
    }

    setAppData((prev) => {
      const next = cloneAppData(prev);
      const nextStats = { ...(next.stats || {}) } as Record<string, VoteStats>;
      const nextUserVotes = { ...(next.userVotes || {}) };
      if (!nextStats[node.id]) nextStats[node.id] = { need: 0, like: 0, curious: 0, neutral: 0, nope: 0 };
      const stats = nextStats[node.id];
      const oldVote = nextUserVotes[node.id] as keyof VoteStats | undefined;
      const nextVote = voteType as keyof VoteStats;
      if (oldVote === nextVote) {
        stats[oldVote] = Math.max(0, (stats[oldVote] ?? 0) - 1);
        delete nextUserVotes[node.id];
      } else {
        if (oldVote) stats[oldVote] = Math.max(0, (stats[oldVote] ?? 0) - 1);
        nextUserVotes[node.id] = voteType;
        stats[nextVote] = (stats[nextVote] || 0) + 1;
      }
      next.stats = nextStats;
      next.userVotes = nextUserVotes;
      return next;
    });

    const userId = await getCurrentUserId();
    if (userId) {
      try {
        await persistNodeVote(userId, node.id, voteType as keyof VoteStats);
      } catch (error) {
        console.error('node vote write failed', error);
        showToast('投票尚未寫入，請稍後再試。');
        return;
      }
    }
    logToSupabase('node_vote', { node_id: node.id, node_label: node.label, vote_type: voteType, userName });
    showToast('投票狀態已更新！');
  };

  return { addPost, handleDeletePost, addReply, toggleReplyUpvote, addReplyEmoji, toggleUpvote, addEmoji, castVote };
}
