"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Edit, Calendar, User, Tag, CheckCircle, XCircle, BookOpen } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import type { Article } from "@/lib/types"

// UUID validation function
const isValidUUID = (str: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export default function ArticleViewPage() {
  const params = useParams()
  const router = useRouter()
  const { user, profile } = useAuth()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewNotes, setReviewNotes] = useState("")
  const [isReviewing, setIsReviewing] = useState(false)

  useEffect(() => {
    const articleId = params.id as string

    // Validate UUID format
    if (!isValidUUID(articleId)) {
      toast.error("Invalid article ID")
      router.push("/dashboard/articles")
      return
    }

    if (articleId && user) {
      fetchArticle(articleId)
    }
  }, [params.id, user, router])

  const fetchArticle = async (articleId: string) => {
    try {
      const { data, error } = await supabase
        .from("articles")
        .select(`
          *,
          author:user_profiles!articles_author_id_fkey(id, full_name, email),
          reviewer:user_profiles!articles_reviewed_by_fkey(id, full_name, email)
        `)
        .eq("id", articleId)
        .single()

      if (error) {
        if (error.code === "PGRST116") {
          toast.error("Article not found")
        } else {
          throw error
        }
        router.push("/dashboard/articles")
        return
      }

      // Check if user can view this article
      const isAuthor = data.author_id === user?.id
      const isAdmin = ["admin", "super_admin"].includes(profile?.role || "")

      if (!isAuthor && !isAdmin) {
        toast.error("You don't have permission to view this article")
        router.push("/dashboard/articles")
        return
      }

      setArticle(data)
      setReviewNotes(data.review_notes || "")
    } catch (error: any) {
      console.error("Error fetching article:", error)
      toast.error("Failed to load article")
      router.push("/dashboard/articles")
    } finally {
      setLoading(false)
    }
  }

  const handleReviewAction = async (status: "approved" | "rejected") => {
    if (!article || !profile) return

    setIsReviewing(true)
    try {
      const { error } = await supabase
        .from("articles")
        .update({
          status,
          reviewed_by: profile.id,
          review_notes: reviewNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", article.id)

      if (error) throw error

      // Log activity
      await supabase.rpc("log_activity", {
        p_user_id: profile.id,
        p_action: `article_${status}`,
        p_resource_type: "article",
        p_resource_id: article.id,
        p_details: { title: article.title, review_notes: reviewNotes },
      })

      toast.success(`Article ${status} successfully`)
      fetchArticle(article.id) // Refresh the article data
    } catch (error: any) {
      console.error("Error reviewing article:", error)
      toast.error(`Failed to ${status} article`)
    } finally {
      setIsReviewing(false)
    }
  }

  const handlePublish = async () => {
    if (!article || !profile) return

    setIsReviewing(true)
    try {
      const { error } = await supabase
        .from("articles")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", article.id)

      if (error) throw error

      // Log activity
      await supabase.rpc("log_activity", {
        p_user_id: profile.id,
        p_action: "article_published",
        p_resource_type: "article",
        p_resource_id: article.id,
        p_details: { title: article.title },
      })

      toast.success("Article published successfully!")
      fetchArticle(article.id) // Refresh the article data
    } catch (error: any) {
      console.error("Error publishing article:", error)
      toast.error("Failed to publish article")
    } finally {
      setIsReviewing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
      case "pending_review":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "published":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!article) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Article not found</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/articles">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Articles
          </Link>
        </Button>
      </div>
    )
  }

  const isAuthor = article.author_id === user?.id
  const isAdmin = ["admin", "super_admin"].includes(profile?.role || "")
  const canEdit = isAuthor && article.status === "draft"
  const canReview = isAdmin && article.status === "pending_review"
  const canPublish = isAdmin && article.status === "approved"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard/articles">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Articles
            </Link>
          </Button>
          <Badge className={getStatusColor(article.status)}>{formatStatus(article.status)}</Badge>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <Button asChild>
              <Link href={`/dashboard/articles/${article.id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Article
              </Link>
            </Button>
          )}
          {canReview && (
            <>
              <Button
                onClick={() => handleReviewAction("approved")}
                disabled={isReviewing}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button variant="destructive" onClick={() => handleReviewAction("rejected")} disabled={isReviewing}>
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </>
          )}
          {canPublish && (
            <Button onClick={handlePublish} disabled={isReviewing}>
              <BookOpen className="h-4 w-4 mr-2" />
              Publish
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-4">
            <CardTitle className="text-3xl">{article.title}</CardTitle>
            {article.excerpt && <p className="text-lg text-muted-foreground">{article.excerpt}</p>}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{article.author?.full_name || article.author?.email || "Unknown Author"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Created: {new Date(article.created_at).toLocaleDateString()}</span>
              </div>
              {article.updated_at !== article.created_at && (
                <div className="flex items-center gap-1">
                  <Edit className="h-4 w-4" />
                  <span>Updated: {new Date(article.updated_at).toLocaleDateString()}</span>
                </div>
              )}
              {article.published_at && (
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span>Published: {new Date(article.published_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
            {article.tags && article.tags.length > 0 && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-wrap gap-1">
                  {article.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {article.featured_image_url && (
            <div className="mb-6">
              <img
                src={article.featured_image_url || "/placeholder.svg"}
                alt={article.title}
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
          )}
          <Separator className="mb-6" />
          <div
            className="prose prose-lg max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </CardContent>
      </Card>

      {/* Review Section for Admins */}
      {isAdmin && (article.status === "pending_review" || article.status === "rejected" || article.review_notes) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Review Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {canReview && (
              <Textarea
                placeholder="Add review notes (optional)..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
              />
            )}
            {!canReview && article.review_notes && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">{article.review_notes}</p>
              </div>
            )}
            {article.reviewer && (
              <p className="text-sm text-muted-foreground">
                Last reviewed by: {article.reviewer.full_name || article.reviewer.email}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* SEO Information */}
      {(article.meta_title || article.meta_description) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">SEO Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {article.meta_title && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Meta Title</label>
                <p className="mt-1">{article.meta_title}</p>
              </div>
            )}
            {article.meta_description && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Meta Description</label>
                <p className="mt-1">{article.meta_description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
