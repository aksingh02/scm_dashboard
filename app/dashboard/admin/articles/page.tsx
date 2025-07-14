"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import type { Article } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CheckCircle, XCircle, Eye } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

export default function AdminArticlesPage() {
  const { profile, hasRole } = useAuth()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewNotes, setReviewNotes] = useState("")
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)

  useEffect(() => {
    if (profile && hasRole(["admin", "super_admin"])) {
      fetchArticles()
    }
  }, [profile])

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from("articles")
        .select(`
          *,
          author:user_profiles!articles_author_id_fkey(full_name, email),
          reviewer:user_profiles!articles_reviewed_by_fkey(full_name, email)
        `)
        .in("status", ["pending_review", "approved", "rejected"])
        .order("created_at", { ascending: false })

      if (error) throw error
      setArticles(data || [])
    } catch (error) {
      console.error("Error fetching articles:", error)
    } finally {
      setLoading(false)
    }
  }

  const reviewArticle = async (articleId: string, status: "approved" | "rejected") => {
    if (!profile) return

    try {
      const { error } = await supabase
        .from("articles")
        .update({
          status,
          reviewed_by: profile.id,
          review_notes: reviewNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", articleId)

      if (error) throw error

      // Log activity
      await supabase.rpc("log_activity", {
        p_user_id: profile.id,
        p_action: `article_${status}`,
        p_resource_type: "article",
        p_resource_id: articleId,
        p_details: { review_notes: reviewNotes },
      })

      toast.success(`Article ${status}`)
      setReviewNotes("")
      setSelectedArticle(null)
      fetchArticles()
    } catch (error) {
      console.error("Error reviewing article:", error)
      toast.error("Failed to review article")
    }
  }

  const publishArticle = async (articleId: string) => {
    try {
      const { error } = await supabase
        .from("articles")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
        })
        .eq("id", articleId)

      if (error) throw error

      toast.success("Article published")
      fetchArticles()
    } catch (error) {
      console.error("Error publishing article:", error)
      toast.error("Failed to publish article")
    }
  }

  if (!hasRole(["admin", "super_admin"])) {
    return <div>Access denied</div>
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Review Articles</h1>
        <p className="text-muted-foreground">Review and manage article submissions</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{articles.filter((a) => a.status === "pending_review").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{articles.filter((a) => a.status === "approved").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{articles.filter((a) => a.status === "published").length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Articles for Review</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{article.title}</div>
                      {article.excerpt && (
                        <div className="text-sm text-muted-foreground truncate max-w-md">{article.excerpt}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{article.author?.full_name || article.author?.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        article.status === "pending_review"
                          ? "secondary"
                          : article.status === "approved"
                            ? "default"
                            : article.status === "rejected"
                              ? "destructive"
                              : "default"
                      }
                    >
                      {article.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDistanceToNow(new Date(article.created_at), { addSuffix: true })}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedArticle(article)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{article.title}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: article.content }} />

                            {article.status === "pending_review" && (
                              <div className="space-y-4 border-t pt-4">
                                <Textarea
                                  placeholder="Add review notes..."
                                  value={reviewNotes}
                                  onChange={(e) => setReviewNotes(e.target.value)}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => reviewArticle(article.id, "approved")}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Approve
                                  </Button>
                                  <Button variant="destructive" onClick={() => reviewArticle(article.id, "rejected")}>
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            )}

                            {article.status === "approved" && (
                              <div className="border-t pt-4">
                                <Button onClick={() => publishArticle(article.id)}>Publish Article</Button>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
