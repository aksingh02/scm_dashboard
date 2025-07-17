"use client"

import { Textarea } from "@/components/ui/textarea"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import type { Article } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, PenTool, CheckCircle, XCircle, BookIcon as Publish } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { toast } from "sonner"

const statusColors = {
  draft: "secondary",
  pending_review: "warning",
  approved: "success",
  rejected: "destructive",
  published: "default",
} as const

export default function ArticleViewPage() {
  const { id } = useParams()
  const router = useRouter()
  const { profile, isAdmin, isSuperAdmin } = useAuth()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewNotes, setReviewNotes] = useState("") // For admin review dialog

  useEffect(() => {
    if (id) {
      fetchArticle()
    }
  }, [id, profile])

  const fetchArticle = async () => {
    if (!profile) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from("articles")
        .select(`
          *,
          author:user_profiles!articles_author_id_fkey(full_name, email),
          reviewer:user_profiles!articles_reviewed_by_fkey(full_name, email)
        `)
        .eq("id", id as string)
        .single()

      if (error) throw error

      // Check if the user is the author or an admin/super_admin
      if (data && (data.author_id === profile.id || isAdmin || isSuperAdmin)) {
        setArticle(data)
      } else {
        // Redirect if not authorized to view this article
        toast.error("You are not authorized to view this article.")
        router.push("/dashboard/articles")
      }
    } catch (error) {
      console.error("Error fetching article:", error)
      toast.error("Failed to load article.")
      router.push("/dashboard/articles")
    } finally {
      setLoading(false)
    }
  }

  const handleReviewAction = async (status: "approved" | "rejected") => {
    if (!profile || !article) return

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

      toast.success(`Article ${status}`)
      setReviewNotes("")
      fetchArticle() // Re-fetch to update status
    } catch (error) {
      console.error("Error reviewing article:", error)
      toast.error("Failed to review article")
    }
  }

  const handlePublish = async () => {
    if (!profile || !article) return

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
      fetchArticle() // Re-fetch to update status
    } catch (error) {
      console.error("Error publishing article:", error)
      toast.error("Failed to publish article")
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading article...</div>
  }

  if (!article) {
    return (
      <div className="flex justify-center items-center h-64 text-muted-foreground">
        Article not found or unauthorized.
      </div>
    )
  }

  const isAuthor = profile?.id === article.author_id
  const canEdit = isAuthor && article.status === "draft"
  const canReview = (isAdmin || isSuperAdmin) && article.status === "pending_review"
  const canPublish = (isAdmin || isSuperAdmin) && article.status === "approved"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Articles
        </Button>
        <div className="flex gap-2">
          {canEdit && (
            <Button asChild>
              <Link href={`/dashboard/articles/${article.id}/edit`}>
                <PenTool className="mr-2 h-4 w-4" />
                Edit Article
              </Link>
            </Button>
          )}
          {canReview && (
            <>
              <Button onClick={() => handleReviewAction("approved")} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button variant="destructive" onClick={() => handleReviewAction("rejected")}>
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          {canPublish && (
            <Button onClick={handlePublish}>
              <Publish className="mr-2 h-4 w-4" />
              Publish
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-4xl font-extrabold mb-2">{article.title}</CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>By {article.author?.full_name || article.author?.email || "Unknown Author"}</span>
            <span>•</span>
            <span>Created: {format(new Date(article.created_at), "MMM dd, yyyy")}</span>
            {article.updated_at && article.updated_at !== article.created_at && (
              <>
                <span>•</span>
                <span>Last Updated: {format(new Date(article.updated_at), "MMM dd, yyyy")}</span>
              </>
            )}
            {article.published_at && (
              <>
                <span>•</span>
                <span>Published: {format(new Date(article.published_at), "MMM dd, yyyy")}</span>
              </>
            )}
          </div>
          <div className="mt-2">
            <Badge variant={statusColors[article.status]}>{article.status.replace("_", " ")}</Badge>
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {article.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="prose max-w-none dark:prose-invert">
          {article.featured_image_url && (
            <img
              src={article.featured_image_url || "/placeholder.svg"}
              alt={article.title}
              className="w-full h-64 object-cover rounded-lg mb-6"
            />
          )}
          {article.excerpt && <p className="lead text-lg font-semibold">{article.excerpt}</p>}
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </CardContent>
      </Card>

      {(article.status === "pending_review" || article.status === "rejected") && (isAdmin || isSuperAdmin) && (
        <Card>
          <CardHeader>
            <CardTitle>Review Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Add review notes..."
              value={reviewNotes || article.review_notes || ""}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={4}
            />
            {article.reviewer && (
              <p className="text-sm text-muted-foreground mt-2">
                Last reviewed by: {article.reviewer.full_name || article.reviewer.email}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
