export type HrArticleStatus = "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";
export type HrArticleVisibility = "PUBLIC" | "AUTHENTICATED" | "PLATFORM_ONLY";
export type HrArticleAuthorType = "APP" | "PLATFORM_USER" | "TENANT_USER" | "PERSON";
export type HrArticleReactionType = "LIKE" | "HELPFUL" | "INSIGHTFUL";
export type HrArticleCommentStatus = "PENDING" | "APPROVED" | "HIDDEN" | "SPAM";

export type HrArticleCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type HrArticleComment = {
  id: string;
  articleId: string;
  parentId: string | null;
  displayName: string;
  email: string | null;
  body: string;
  status: HrArticleCommentStatus;
  approvedAt: string | null;
  createdAt: string;
};

export type HrArticle = {
  id: string;
  categoryId: string | null;
  category?: HrArticleCategory | null;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string;
  body: string;
  heroImageUrl: string | null;
  readingMinutes: number;
  status: HrArticleStatus;
  visibility: HrArticleVisibility;
  featured: boolean;
  pinned: boolean;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  authorType: HrArticleAuthorType;
  authoredByApp: boolean;
  authorUserId: string | null;
  authorPersonId: string | null;
  authorName: string;
  authorTitle: string | null;
  authorAvatarUrl: string | null;
  readCount: number;
  likeCount: number;
  helpfulCount: number;
  commentCount: number;
  shareCount: number;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HrArticleListResponse = {
  data: HrArticle[];
  categories: HrArticleCategory[];
  page: {
    limit: number;
    offset: number;
    total: number;
  };
};

export type HrArticleDetail = HrArticle & {
  comments: HrArticleComment[];
  related: HrArticle[];
};

export type HrArticleReactionResponse = {
  active: boolean;
  type: HrArticleReactionType;
  likeCount: number;
  helpfulCount: number;
};
