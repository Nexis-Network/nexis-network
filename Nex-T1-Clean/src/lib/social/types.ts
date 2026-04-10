export type SocialPostKind = "post" | "prompt_template" | "skill_template";

export type SocialAuthor = {
  id: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
};

export type SocialPostStats = {
  likes: number;
  comments: number;
  bookmarks: number;
  shares: number;
};

export type SocialPostViewerState = {
  liked: boolean;
  bookmarked: boolean;
  shared: boolean;
  isFollowingAuthor: boolean;
  isOwnPost: boolean;
};

export type SocialShareContext = {
  userId: string;
  user: SocialAuthor;
  sharedAt: string;
  isViewerShare: boolean;
};

export type SocialPost = {
  id: string;
  authorId: string;
  kind: SocialPostKind;
  title: string | null;
  content: string;
  metadata: Record<string, UntypedJson>;
  createdAt: string;
  updatedAt: string;
  author: SocialAuthor;
  sharedContext?: SocialShareContext;
  stats: SocialPostStats;
  viewer: SocialPostViewerState;
};

export type SocialComment = {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: SocialAuthor;
  isOwnComment: boolean;
};

export type SocialProfile = {
  id: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  stats: {
    posts: number;
    prompts: number;
    skills: number;
    followers: number;
    following: number;
    bookmarks: number;
  };
  viewer: {
    isOwnProfile: boolean;
    isFollowing: boolean;
  };
};

export type SocialFollowProfile = {
  id: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  createdAt: string;
  viewerIsFollowing: boolean;
};

export type SocialFollowsResponse = {
  targetUserId: string;
  followers: SocialFollowProfile[];
  following: SocialFollowProfile[];
};

export type SocialConversationStatus = "success" | "failure" | "in_progress";

export type SocialConversationSortOrder = "asc" | "desc";

export type SocialConversationTimePeriod =
  | "all"
  | "24h"
  | "7d"
  | "30d"
  | "90d";

export type SocialMessagesConversation = {
  id: string;
  title: string;
  model: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessage: string | null;
  lastMessageRole: "user" | "assistant" | null;
  lastMessageAt: string | null;
  messageCount: number;
  lastActivityAt: string;
  status: SocialConversationStatus;
  searchText: string;
};
