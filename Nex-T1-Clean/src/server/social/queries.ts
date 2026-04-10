import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  SocialComment,
  SocialFollowProfile,
  SocialFollowsResponse,
  SocialPost,
  SocialPostKind,
  SocialProfile,
  SocialAuthor,
  SocialMessagesConversation,
  SocialShareContext,
} from "@/lib/social/types";
import {
  buildSocialConversationSearchText,
  deriveSocialConversationStatus,
} from "@/lib/social/chat-history";

type SocialPostScope = "me" | "explore" | "following" | "bookmarks" | "shared" | "user";

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
};

type SocialPostRow = {
  id: string;
  author_id: string;
  kind: SocialPostKind;
  title: string | null;
  content: string;
  metadata: Record<string, UntypedJson> | null;
  created_at: string;
  updated_at: string;
};

type SocialPostCollectionRow = {
  post_id: string;
  user_id: string;
  created_at: string;
};

function toAuthor(row: ProfileRow | null | undefined): SocialAuthor {
  return {
    id: row?.id ?? "",
    displayName: row?.display_name ?? null,
    username: row?.username ?? null,
    avatarUrl: row?.avatar_url ?? null,
    bannerUrl: row?.banner_url ?? null,
    bio: row?.bio ?? null,
  };
}

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

async function loadProfilesMap(admin: SupabaseClient, ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map<string, ProfileRow>();
  }

  const { data } = await admin
    .from("profiles")
    .select("id, display_name, username, avatar_url, banner_url, bio")
    .in("id", uniqueIds);

  const map = new Map<string, ProfileRow>();
  for (const row of (data ?? []) as ProfileRow[]) {
    map.set(row.id, row);
  }
  return map;
}

export async function loadSocialPosts(params: {
  admin: SupabaseClient;
  viewerUserId: string;
  scope: SocialPostScope;
  kind: SocialPostKind | "all";
  limit: number;
  offset?: number;
  targetUserId?: string;
}): Promise<SocialPost[]> {
  const { admin, viewerUserId, scope, kind, limit, offset = 0, targetUserId } = params;
  const start = Math.max(0, offset);
  const end = start + Math.max(0, limit) - 1;

  let postRows: SocialPostRow[] = [];
  const sharedAtByPostId = new Map<string, string>();
  let sharedByUserId: string | null = null;

  if (scope === "bookmarks" || scope === "shared") {
    const collectionTable = scope === "bookmarks" ? "social_post_bookmarks" : "social_post_shares";
    const collectionUserId =
      scope === "shared" && targetUserId ? targetUserId : viewerUserId;

    // Bookmarks are private to the viewer only.
    if (scope === "bookmarks" && targetUserId && targetUserId !== viewerUserId) {
      return [];
    }

    const { data: collectionRows } = await admin
      .from(collectionTable)
      .select("post_id, user_id, created_at")
      .eq("user_id", collectionUserId)
      .order("created_at", { ascending: false })
      .range(start, end);

    const typedCollectionRows = (collectionRows ?? []) as SocialPostCollectionRow[];
    const orderedPostIds = typedCollectionRows.map((row) => String(row.post_id));
    if (orderedPostIds.length === 0) {
      return [];
    }

    if (scope === "shared") {
      sharedByUserId = String(typedCollectionRows[0]?.user_id ?? collectionUserId);
      for (const row of typedCollectionRows) {
        sharedAtByPostId.set(String(row.post_id), String(row.created_at));
      }
    }

    let postsQuery = admin
      .from("social_posts")
      .select("id, author_id, kind, title, content, metadata, created_at, updated_at")
      .in("id", orderedPostIds);

    if (kind !== "all") {
      postsQuery = postsQuery.eq("kind", kind);
    }

    const { data: rows } = await postsQuery;
    const byId = new Map<string, SocialPostRow>();
    for (const row of (rows ?? []) as SocialPostRow[]) {
      byId.set(String(row.id), row);
    }

    postRows = orderedPostIds
      .map((id) => byId.get(id))
      .filter((row): row is SocialPostRow => Boolean(row));
  } else {
    let postsQuery = admin
      .from("social_posts")
      .select("id, author_id, kind, title, content, metadata, created_at, updated_at")
      .order("created_at", { ascending: false })
      .range(start, end);

    if (kind !== "all") {
      postsQuery = postsQuery.eq("kind", kind);
    }

    if (scope === "me") {
      postsQuery = postsQuery.eq("author_id", viewerUserId);
    }

    if (scope === "explore") {
      postsQuery = postsQuery.neq("author_id", viewerUserId);
    }

    if (scope === "user" && targetUserId) {
      postsQuery = postsQuery.eq("author_id", targetUserId);
    }

    if (scope === "following") {
      const { data: followingRows } = await admin
        .from("social_follows")
        .select("following_id")
        .eq("follower_id", viewerUserId);

      const followingIds = (followingRows ?? []).map((row) => String(row.following_id));
      if (followingIds.length === 0) {
        return [];
      }
      postsQuery = postsQuery.in("author_id", followingIds);
    }

    const { data: rows } = await postsQuery;
    postRows = (rows ?? []) as SocialPostRow[];
  }

  if (postRows.length === 0) {
    return [];
  }

  const postIds = postRows.map((row) => String(row.id));
  const authorIds = postRows.map((row) => String(row.author_id));
  const profileIds =
    sharedByUserId ? [...authorIds, sharedByUserId] : authorIds;

  const [profilesMap, likesRes, bookmarksRes, commentsRes, sharesRes, followingRes] =
    await Promise.all([
      loadProfilesMap(admin, profileIds),
      admin.from("social_post_likes").select("post_id, user_id").in("post_id", postIds),
      admin.from("social_post_bookmarks").select("post_id, user_id").in("post_id", postIds),
      admin.from("social_post_comments").select("post_id").in("post_id", postIds),
      admin.from("social_post_shares").select("post_id, user_id").in("post_id", postIds),
      admin
        .from("social_follows")
        .select("following_id")
        .eq("follower_id", viewerUserId)
        .in("following_id", Array.from(new Set(authorIds))),
    ]);

  const likeCounts = new Map<string, number>();
  const bookmarkCounts = new Map<string, number>();
  const commentCounts = new Map<string, number>();
  const shareCounts = new Map<string, number>();

  const likedByViewer = new Set<string>();
  const bookmarkedByViewer = new Set<string>();
  const sharedByViewer = new Set<string>();

  for (const row of likesRes.data ?? []) {
    const postId = String(row.post_id);
    increment(likeCounts, postId);
    if (String(row.user_id) === viewerUserId) {
      likedByViewer.add(postId);
    }
  }

  for (const row of bookmarksRes.data ?? []) {
    const postId = String(row.post_id);
    increment(bookmarkCounts, postId);
    if (String(row.user_id) === viewerUserId) {
      bookmarkedByViewer.add(postId);
    }
  }

  for (const row of commentsRes.data ?? []) {
    increment(commentCounts, String(row.post_id));
  }

  for (const row of sharesRes.data ?? []) {
    const postId = String(row.post_id);
    increment(shareCounts, postId);
    if (String(row.user_id) === viewerUserId) {
      sharedByViewer.add(postId);
    }
  }

  const followingAuthorIds = new Set<string>(
    (followingRes.data ?? []).map((row) => String(row.following_id)),
  );

  return postRows.map((row) => {
    const postId = String(row.id);
    const authorId = String(row.author_id);
    const sharedContext =
      scope === "shared" && sharedByUserId && sharedAtByPostId.has(postId)
        ? ({
            userId: sharedByUserId,
            user: toAuthor(profilesMap.get(sharedByUserId)),
            sharedAt: sharedAtByPostId.get(postId) ?? row.created_at,
            isViewerShare: sharedByUserId === viewerUserId,
          } satisfies SocialShareContext)
        : undefined;

    return {
      id: postId,
      authorId,
      kind: row.kind,
      title: row.title ?? null,
      content: row.content,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      author: toAuthor(profilesMap.get(authorId)),
      sharedContext,
      stats: {
        likes: likeCounts.get(postId) ?? 0,
        comments: commentCounts.get(postId) ?? 0,
        bookmarks: bookmarkCounts.get(postId) ?? 0,
        shares: shareCounts.get(postId) ?? 0,
      },
      viewer: {
        liked: likedByViewer.has(postId),
        bookmarked: bookmarkedByViewer.has(postId),
        shared: sharedByViewer.has(postId),
        isFollowingAuthor: followingAuthorIds.has(authorId),
        isOwnPost: authorId === viewerUserId,
      },
    } satisfies SocialPost;
  });
}

export async function loadSocialPostById(params: {
  admin: SupabaseClient;
  viewerUserId: string;
  postId: string;
}): Promise<SocialPost | null> {
  const { admin, viewerUserId, postId } = params;

  const { data: row } = await admin
    .from("social_posts")
    .select("id, author_id, kind, title, content, metadata, created_at, updated_at")
    .eq("id", postId)
    .maybeSingle();

  if (!row) {
    return null;
  }

  const postRow = row as SocialPostRow;
  const authorId = String(postRow.author_id);

  const [profilesMap, likesRes, bookmarksRes, commentsRes, sharesRes, viewerFollowRes] =
    await Promise.all([
      loadProfilesMap(admin, [authorId]),
      admin.from("social_post_likes").select("user_id").eq("post_id", postId),
      admin.from("social_post_bookmarks").select("user_id").eq("post_id", postId),
      admin.from("social_post_comments").select("id").eq("post_id", postId),
      admin.from("social_post_shares").select("user_id").eq("post_id", postId),
      admin
        .from("social_follows")
        .select("following_id")
        .eq("follower_id", viewerUserId)
        .eq("following_id", authorId)
        .maybeSingle(),
    ]);

  const likedByViewer = (likesRes.data ?? []).some(
    (entry) => String(entry.user_id) === viewerUserId,
  );
  const bookmarkedByViewer = (bookmarksRes.data ?? []).some(
    (entry) => String(entry.user_id) === viewerUserId,
  );
  const sharedByViewer = (sharesRes.data ?? []).some(
    (entry) => String(entry.user_id) === viewerUserId,
  );

  return {
    id: String(postRow.id),
    authorId,
    kind: postRow.kind,
    title: postRow.title ?? null,
    content: postRow.content,
    metadata: postRow.metadata ?? {},
    createdAt: postRow.created_at,
    updatedAt: postRow.updated_at,
    author: toAuthor(profilesMap.get(authorId)),
    stats: {
      likes: likesRes.data?.length ?? 0,
      comments: commentsRes.data?.length ?? 0,
      bookmarks: bookmarksRes.data?.length ?? 0,
      shares: sharesRes.data?.length ?? 0,
    },
    viewer: {
      liked: likedByViewer,
      bookmarked: bookmarkedByViewer,
      shared: sharedByViewer,
      isFollowingAuthor: Boolean(viewerFollowRes.data),
      isOwnPost: authorId === viewerUserId,
    },
  } satisfies SocialPost;
}

export async function loadSocialProfile(params: {
  admin: SupabaseClient;
  viewerUserId: string;
  targetUserId: string;
}): Promise<SocialProfile | null> {
  const { admin, viewerUserId, targetUserId } = params;

  const { data: profileRow } = await admin
    .from("profiles")
    .select("id, display_name, username, avatar_url, banner_url, bio")
    .eq("id", targetUserId)
    .maybeSingle();

  if (!profileRow) {
    return null;
  }

  const [postsCount, promptsCount, skillsCount, followersCount, followingCount, bookmarksCount, followEdge] =
    await Promise.all([
      admin
        .from("social_posts")
        .select("id", { count: "exact", head: true })
        .eq("author_id", targetUserId),
      admin
        .from("social_posts")
        .select("id", { count: "exact", head: true })
        .eq("author_id", targetUserId)
        .eq("kind", "prompt_template"),
      admin
        .from("social_posts")
        .select("id", { count: "exact", head: true })
        .eq("author_id", targetUserId)
        .eq("kind", "skill_template"),
      admin
        .from("social_follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("following_id", targetUserId),
      admin
        .from("social_follows")
        .select("following_id", { count: "exact", head: true })
        .eq("follower_id", targetUserId),
      admin
        .from("social_post_bookmarks")
        .select("post_id", { count: "exact", head: true })
        .eq("user_id", targetUserId),
      viewerUserId === targetUserId
        ? Promise.resolve({ data: null })
        : admin
            .from("social_follows")
            .select("following_id")
            .eq("follower_id", viewerUserId)
            .eq("following_id", targetUserId)
            .maybeSingle(),
    ]);

  return {
    id: profileRow.id,
    displayName: profileRow.display_name ?? null,
    username: profileRow.username ?? null,
    avatarUrl: profileRow.avatar_url ?? null,
    bannerUrl: profileRow.banner_url ?? null,
    bio: profileRow.bio ?? null,
    stats: {
      posts: postsCount.count ?? 0,
      prompts: promptsCount.count ?? 0,
      skills: skillsCount.count ?? 0,
      followers: followersCount.count ?? 0,
      following: followingCount.count ?? 0,
      bookmarks: bookmarksCount.count ?? 0,
    },
    viewer: {
      isOwnProfile: viewerUserId === targetUserId,
      isFollowing: Boolean(followEdge.data),
    },
  };
}

export async function loadSocialFollows(params: {
  admin: SupabaseClient;
  viewerUserId: string;
  targetUserId: string;
  limit?: number;
}): Promise<SocialFollowsResponse> {
  const { admin, viewerUserId, targetUserId, limit = 60 } = params;

  const [followersRes, followingRes] = await Promise.all([
    admin
      .from("social_follows")
      .select("follower_id, created_at")
      .eq("following_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(limit),
    admin
      .from("social_follows")
      .select("following_id, created_at")
      .eq("follower_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const followerIds = (followersRes.data ?? []).map((row) => String(row.follower_id));
  const followingIds = (followingRes.data ?? []).map((row) => String(row.following_id));

  const allIds = Array.from(new Set([...followerIds, ...followingIds]));
  const [profilesMap, viewerFollowRes] = await Promise.all([
    loadProfilesMap(admin, allIds),
    allIds.length > 0
      ? admin
          .from("social_follows")
          .select("following_id")
          .eq("follower_id", viewerUserId)
          .in("following_id", allIds)
      : Promise.resolve({ data: [] as Array<{ following_id: string }> }),
  ]);

  const viewerFollowingSet = new Set(
    (viewerFollowRes.data ?? []).map((row) => String(row.following_id)),
  );

  const followers: SocialFollowProfile[] = (followersRes.data ?? []).map((row) => {
    const profile = profilesMap.get(String(row.follower_id));
    return {
      ...toAuthor(profile),
      createdAt: String(row.created_at),
      viewerIsFollowing: viewerFollowingSet.has(String(row.follower_id)),
    };
  });

  const following: SocialFollowProfile[] = (followingRes.data ?? []).map((row) => {
    const profile = profilesMap.get(String(row.following_id));
    return {
      ...toAuthor(profile),
      createdAt: String(row.created_at),
      viewerIsFollowing: viewerFollowingSet.has(String(row.following_id)),
    };
  });

  return {
    targetUserId,
    followers,
    following,
  };
}

export async function loadSocialComments(params: {
  admin: SupabaseClient;
  viewerUserId: string;
  postId: string;
  limit?: number;
}): Promise<SocialComment[]> {
  const { admin, viewerUserId, postId, limit = 120 } = params;

  const { data: commentRows } = await admin
    .from("social_post_comments")
    .select("id, post_id, user_id, content, created_at, updated_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(limit);

  const rows = commentRows ?? [];
  if (rows.length === 0) {
    return [];
  }

  const userIds = rows.map((row) => String(row.user_id));
  const profilesMap = await loadProfilesMap(admin, userIds);

  return rows.map((row) => {
    const authorId = String(row.user_id);
    return {
      id: String(row.id),
      postId: String(row.post_id),
      userId: authorId,
      content: String(row.content ?? ""),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at ?? row.created_at),
      author: toAuthor(profilesMap.get(authorId)),
      isOwnComment: authorId === viewerUserId,
    };
  });
}

export async function loadSocialMessages(params: {
  admin: SupabaseClient;
  userId: string;
  limit?: number;
}): Promise<SocialMessagesConversation[]> {
  const { admin, userId, limit = 50 } = params;
  const RECENT_SEARCH_SNIPPETS_LIMIT = 3;

  const { data: conversations } = await admin
    .from("conversations")
    .select("id, title, model, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  const conversationRows = conversations ?? [];
  if (conversationRows.length === 0) {
    return [];
  }

  const conversationIds = conversationRows.map((row) => String(row.id));

  const { data: messageRows } = await admin
    .from("conversation_messages")
    .select("conversation_id, role, content, created_at, parts")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false })
    .limit(1000);

  const latestMessageByConversation = new Map<
    string,
    {
      role: "user" | "assistant" | null;
      content: string | null;
      createdAt: string | null;
      parts: Array<unknown> | null;
    }
  >();
  const messageCountByConversation = new Map<string, number>();
  const recentSearchSnippetsByConversation = new Map<string, string[]>();

  for (const row of messageRows ?? []) {
    const conversationId = String(row.conversation_id);
    increment(messageCountByConversation, conversationId);

    const content = typeof row.content === "string" ? row.content : null;
    if (content) {
      const existingSnippets = recentSearchSnippetsByConversation.get(conversationId) ?? [];
      if (existingSnippets.length < RECENT_SEARCH_SNIPPETS_LIMIT) {
        existingSnippets.push(content);
        recentSearchSnippetsByConversation.set(conversationId, existingSnippets);
      }
    }

    if (!latestMessageByConversation.has(conversationId)) {
      const role = row.role === "assistant" || row.role === "user" ? row.role : null;
      latestMessageByConversation.set(conversationId, {
        role,
        content,
        createdAt: typeof row.created_at === "string" ? row.created_at : null,
        parts: Array.isArray(row.parts) ? (row.parts as Array<unknown>) : null,
      });
    }
  }

  return conversationRows.map((row) => {
    const id = String(row.id);
    const latest = latestMessageByConversation.get(id);
    const lastActivityAt = latest?.createdAt ?? String(row.updated_at);
    const status = deriveSocialConversationStatus({
      lastMessageRole: latest?.role ?? null,
      parts: latest?.parts,
    });
    const recentSnippets = recentSearchSnippetsByConversation.get(id) ?? [];

    return {
      id,
      title: String(row.title ?? "Untitled conversation"),
      model: row.model ?? null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      lastMessage: latest?.content ?? null,
      lastMessageRole: latest?.role ?? null,
      lastMessageAt: latest?.createdAt ?? null,
      messageCount: messageCountByConversation.get(id) ?? 0,
      lastActivityAt,
      status,
      searchText: buildSocialConversationSearchText([
        String(row.title ?? "Untitled conversation"),
        typeof row.model === "string" ? row.model : null,
        latest?.content ?? null,
        ...recentSnippets,
      ]),
    };
  });
}

export async function enqueueSocialNotification(params: {
  admin: SupabaseClient;
  userId: string;
  actorUserId: string;
  title: string;
  body: string;
  url?: string;
  metadata?: Record<string, UntypedJson>;
}) {
  const { admin, userId, actorUserId, title, body, url, metadata } = params;

  if (!userId || userId === actorUserId) {
    return;
  }

  await admin.from("notifications").insert({
    user_id: userId,
    source: "system",
    title,
    body,
    status: "info",
    url: url ?? null,
    metadata: {
      ...(metadata ?? {}),
      category: "social",
      read: false,
      actor_user_id: actorUserId,
    },
  });
}
