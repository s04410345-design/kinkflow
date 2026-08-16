import { useRef } from 'react';
import {
  createDiscussion,
  createDiscussionReply,
  deleteDiscussionById,
  deleteDiscussionReplyById,
  getCurrentUserId,
  notifyReply,
  persistDiscussionLike,
  persistNodeVote,
} from '@/lib/data/nodeInteractions';
import type { AppData, DiscussionPost, GraphNode, Reply, EmojiCount, VoteStats } from '@/lib/types';
import { logToSupabase } from '@/lib/constants';
import { VOTE_TYPES, type VoteType } from '@/lib/contentModel';
import { createLobbyChatMessage, lobbyChatToDiscussionPost } from '@/lib/data/lobbyChat';

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
  return structuredClone(data);
}

function updatePosts(data: AppData, postId: string | number, updater: (post: DiscussionPost) => DiscussionPost): AppData {
  for (const key of Object.keys(data.discussions)) {
    const posts = data.discussions[key];
    if (!posts) continue;
    data.discussions[key] = posts.map((post) => post.id === postId ? updater(post) : post);
  }
  return data;
}

export function useDrawerActions({ node, dbKey, posts, userName, isGuest, lobbyTab, setAppData, showToast }: DrawerActionParams) {
  const lastSubmitRef = useRef(0);

  const addPost = async (text: string) => {
    if (Date.now() - lastSubmitRef.current < 500) return;
    if (isGuest && !(node.level === 0 && lobbyTab === 'chat')) {
      showToast('訪客僅能在即時聊天室發言，註冊完整帳號即可建立討論版。');
      return;
    }

    const safeText = text.trim();
    if (!safeText) return;
    lastSubmitRef.current = Date.now();
    showToast('防洗版偵測中……');
    try {
      const res = await fetch('/api/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: safeText, author: userName }),
      });
      const data = (await res.json()) as { action?: string; message?: string };
      if (data.action === 'BLOCK') {
        showToast(data.message || '含有違規內容，已阻擋發布。');
        return;
      }
    } catch (error) {
      console.warn('內容審核服務暫時無法連線：', error);
    }

    if (node.level === 0 && lobbyTab === 'chat') {
      const result = await createLobbyChatMessage(safeText);
      if (!result.ok) {
        showToast(result.message || '聊天訊息發送失敗。');
        return;
      }
      const optimisticPost = {
        ...lobbyChatToDiscussionPost({
          id: `optimistic-${Date.now()}`,
          author_id: null,
          text: safeText,
          media_url: null,
          parent_id: null,
          is_hidden: false,
          created_at: new Date().toISOString(),
        }),
        author: isGuest ? '訪客' : userName,
      };
      setAppData((prev) => {
        const next = cloneAppData(prev);
        next.discussions[dbKey] = [...(next.discussions[dbKey] || []), optimisticPost];
        return next;
      });
      showToast('已送出聊天訊息。');
      return;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      showToast('請先登入會員才能建立討論。');
      return;
    }

    try {
      const newPost = await createDiscussion(dbKey, userId, userName, safeText);
      setAppData((prev) => {
        const next = cloneAppData(prev);
        next.discussions[dbKey] = [...(next.discussions[dbKey] || []), newPost];
        return next;
      });
      showToast('討論已發布。');
    } catch (error) {
      showToast(`發布失敗：${error instanceof Error ? error.message : '請稍後再試。'}`);
    }
  };

  const handleDeletePost = async (postId: string | number, replyId?: string | number) => {
    try {
      if (replyId !== undefined) {
        await deleteDiscussionReplyById(replyId);
        setAppData((prev) => {
          const next = cloneAppData(prev);
          const post = next.discussions[dbKey]?.find((item) => item.id === postId);
          if (post) post.replies = (post.replies || []).filter((reply: Reply) => reply.id !== replyId);
          return next;
        });
      } else {
        const result = await deleteDiscussionById(postId);
        void result;
        setAppData((prev) => {
          const next = cloneAppData(prev);
          next.discussions[dbKey] = next.discussions[dbKey]?.filter((item) => item.id !== postId) || [];
          return next;
        });
      }
      showToast('留言已刪除。');
    } catch (error) {
      console.warn('留言刪除失敗：', error);
      showToast('刪除失敗，請重新整理後再試。');
    }
  };

  const addReply = async (postId: string | number, text: string) => {
    if (Date.now() - lastSubmitRef.current < 500) return;
    if (isGuest && !(node.level === 0 && lobbyTab === 'chat')) {
      showToast('訪客僅能在即時聊天室發言，註冊完整帳號即可回覆討論版。');
      return;
    }
    lastSubmitRef.current = Date.now();

    const userId = await getCurrentUserId();
    const post = posts.find((item) => item.id === postId);
    if (!userId || !post) {
      showToast('請先登入會員並重新整理留言後再回覆。');
      return;
    }

    try {
      const reply = await createDiscussionReply(node.id, String(postId), userId, userName, text);
      setAppData((prev) => {
        const next = cloneAppData(prev);
        const target = next.discussions[dbKey]?.find((item) => item.id === postId);
        if (target) target.replies = [...(target.replies || []), reply];
        return next;
      });
      const targetAuthorName = post.author.replace(/ ☑️/g, '').replace(/ 👻/g, '').trim();
      const cleanCurrentName = userName.replace(/ ☑️/g, '').replace(/ 👻/g, '').trim();
      if (targetAuthorName && targetAuthorName !== cleanCurrentName) {
        void notifyReply(targetAuthorName, cleanCurrentName, text, node.id).catch((error) => console.warn('回覆通知失敗：', error));
      }
      showToast('已送出回覆。');
    } catch (error) {
      showToast(`回覆失敗：${error instanceof Error ? error.message : '請稍後再試。'}`);
    }
  };

  const toggleReplyUpvote = (postId: string | number, replyId: string | number) => {
    setAppData((prev) => {
      const next = cloneAppData(prev);
      const voted = Boolean(next.userEmojis?.[`reply_up_${replyId}`]);
      next.userEmojis = { ...(next.userEmojis || {}) };
      if (voted) delete next.userEmojis[`reply_up_${replyId}`];
      else next.userEmojis[`reply_up_${replyId}`] = true;
      return updatePosts(next, postId, (post) => ({
        ...post,
        replies: (post.replies || []).map((reply: Reply) => reply.id === replyId
          ? { ...reply, upvotes: Math.max(0, (reply.upvotes || 0) + (voted ? -1 : 1)) }
          : reply),
      }));
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
      return updatePosts(next, postId, (post) => ({
        ...post,
        replies: (post.replies || []).map((reply: Reply) => {
          if (reply.id !== replyId) return reply;
          const emojis: EmojiCount[] = [...(reply.emojis || [])];
          const existing = emojis.find((item) => item.char === emoji);
          if (reacted && existing) existing.count = Math.max(0, existing.count - 1);
          else if (existing) existing.count += 1;
          else emojis.push({ char: emoji, count: 1 });
          return { ...reply, emojis: emojis.filter((item) => item.count > 0) };
        }),
      }));
    });
  };

  const toggleUpvote = async (postId: string | number) => {
    const userId = await getCurrentUserId();
    const isPersistableDiscussion = typeof postId === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(postId) && !(node.level === 0 && lobbyTab === 'chat');
    if (!userId || !isPersistableDiscussion) {
      setAppData((prev) => {
        const next = cloneAppData(prev);
        next.userUpvotes = { ...(next.userUpvotes || {}) };
        const voted = Boolean(next.userUpvotes[postId]);
        if (voted) delete next.userUpvotes[postId];
        else next.userUpvotes[postId] = true;
        return updatePosts(next, postId, (post) => ({ ...post, upvotes: Math.max(0, post.upvotes + (voted ? -1 : 1)) }));
      });
      return;
    }

    try {
      const result = await persistDiscussionLike(userId, postId);
      setAppData((prev) => {
        const next = cloneAppData(prev);
        next.userUpvotes = { ...(next.userUpvotes || {}) };
        if (result.liked) next.userUpvotes[postId] = true;
        else delete next.userUpvotes[postId];
        return updatePosts(next, postId, (post) => ({ ...post, upvotes: result.count }));
      });
    } catch (error) {
      console.warn('討論喜好寫入失敗：', error);
      showToast('喜好狀態尚未寫入，請稍後再試。');
    }
  };

  const addEmoji = (postId: string | number, emoji: string) => {
    setAppData((prev) => {
      const next = cloneAppData(prev);
      next.userEmojis = { ...(next.userEmojis || {}) };
      const key = `${postId}_${emoji}`;
      const reacted = Boolean(next.userEmojis[key]);
      if (reacted) delete next.userEmojis[key];
      else next.userEmojis[key] = true;
      return updatePosts(next, postId, (post) => {
        const emojis = [...(post.emojis || [])];
        const existing = emojis.find((item) => item.char === emoji);
        if (reacted && existing) existing.count = Math.max(0, existing.count - 1);
        else if (existing) existing.count += 1;
        else emojis.push({ char: emoji, count: 1 });
        return { ...post, emojis: emojis.filter((item) => item.count > 0) };
      });
    });
  };

  const castVote = async (voteType: string) => {
    if (!VOTE_TYPES.includes(voteType as VoteType)) {
      showToast('投票選項無效，請重新選擇。');
      return;
    }
    if (isGuest) {
      showToast('請註冊完整帳號以參與節點喜好投票。');
      return;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      showToast('登入狀態已失效，請重新登入後投票。');
      return;
    }

    try {
      const result = await persistNodeVote(userId, node.id, voteType as VoteType);
      setAppData((prev) => {
        const next = cloneAppData(prev);
        next.stats = { ...(next.stats || {}), [node.id]: result.stats };
        next.userVotes = { ...(next.userVotes || {}) };
        if (result.oldVote === voteType) delete next.userVotes[node.id];
        else next.userVotes[node.id] = voteType;
        return next;
      });
      logToSupabase('node_vote', { node_id: node.id, node_label: node.label, vote_type: voteType, userName });
      showToast('投票狀態已更新。');
    } catch (error) {
      console.warn('節點投票寫入失敗：', error);
      showToast('投票尚未寫入，請稍後再試。');
    }
  };

  return { addPost, handleDeletePost, addReply, toggleReplyUpvote, addReplyEmoji, toggleUpvote, addEmoji, castVote };
}
