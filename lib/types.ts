export type UserRole = "author" | "admin" | "super_admin"
export type ArticleStatus = "draft" | "pending_review" | "approved" | "rejected" | "published"

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  role: UserRole
  avatar_url?: string
  bio?: string
  created_at: string
  updated_at: string
}

export interface Article {
  id: string
  title: string
  slug: string
  content: any // Rich text JSON content
  excerpt?: string
  featured_image_url?: string
  author_id: string
  status: ArticleStatus
  published_at?: string
  created_at: string
  updated_at: string
  reviewed_by?: string
  review_notes?: string
  tags: string[]
  meta_title?: string
  meta_description?: string
  author?: UserProfile
  reviewer?: UserProfile
}

export interface ArticleRevision {
  id: string
  article_id: string
  title: string
  content: any
  revised_by: string
  revision_notes?: string
  created_at: string
  reviser?: UserProfile
}

export interface ActivityLog {
  id: string
  user_id: string
  action: string
  resource_type: string
  resource_id?: string
  details?: any
  created_at: string
  user?: UserProfile
}
