"use client"

import { Label } from "@/components/ui/label"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import type { Article } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { CheckCircle, XCircle, Eye, BookIcon as Publish } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import Link from "next/link"

const statusColors = {
  draft: "secondary",
  pending_review: "warning",
  approved: "success",
  rejected: "destructive",
  published: "default",
} as const

export default function AdminArticlesPage() {
  const { profile, hasRole } = useAuth()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewNotes, setReviewNotes] = useState("")
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)

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
        .in("status", ["pending_review", "approved", "rejected", "published"]) // Include published for overview
        .order("created_at", { ascending: false })

      if (error) throw error
      setArticles(data || [])
    } catch (error) {
      console.error("Error fetching articles:", error)
      toast.error("Failed to load articles for review.")
    } finally {
      setLoading(false)
    }
  }

  const handleReviewAction = async (status: "approved" | "rejected") => {
    if (!profile || !selectedArticle) return

    try {
      const { error } = await supabase
        .from("articles")
        .update({
          status,
          reviewed_by: profile.id,
          review_notes: reviewNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedArticle.id)

      if (error) throw error

      // Log activity
      await supabase.rpc("log_activity", {
        p_user_id: profile.id,
        p_action: `article_${status}`,
        p_resource_type: "article",
        p_resource_id: selectedArticle.id,
        p_details: { title: selectedArticle.title, review_notes: reviewNotes },
      })

      toast.success(`Article ${status}`)
      setReviewNotes("")
      setIsReviewDialogOpen(false)
      fetchArticles()
    } catch (error) {
      console.error("Error reviewing article:", error)
      toast.error("Failed to review article")
    }
  }

  const handlePublish = async (articleId: string) => {
    if (!profile) return

    try {
      const { error } = await supabase
        .from("articles")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", articleId)

      if (error) throw error

      // Log activity
      await supabase.rpc("log_activity", {
        p_user_id: profile.id,
        p_action: "article_published",
        p_resource_type: "article",
        p_resource_id: articleId,
        p_details: { title: articles.find((a) => a.id === articleId)?.title },
      })

      toast.success("Article published successfully!")
      fetchArticles()
    } catch (error) {
      console.error("Error publishing article:", error)
      toast.error("Failed to publish article")
    }
  }

  if (!hasRole(["admin", "super_admin"])) {
    return (
      <div className="flex justify-center items-center h-64 text-muted-foreground">
        Access denied. You do not have the necessary permissions to view this page.
      </div>
    )
  }

  if (loading) {
    return <div>Loading articles for review...</div>
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
          {articles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No articles to review at the moment.</div>
          ) : (
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
                      <Badge variant={statusColors[article.status]}>{article.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>{formatDistanceToNow(new Date(article.created_at), { addSuffix: true })}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/articles/${article.id}`}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Link>
                        </Button>
                        {article.status === "pending_review" && (
                          <Dialog
                            open={isReviewDialogOpen && selectedArticle?.id === article.id}
                            onOpenChange={setIsReviewDialogOpen}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedArticle(article)
                                  setReviewNotes(article.review_notes || "")
                                  setIsReviewDialogOpen(true)
                                }}
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="sr-only">Review</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Review Article: {selectedArticle?.title}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div
                                  className="prose max-w-none"
                                  dangerouslySetInnerHTML={{ __html: selectedArticle?.content || "" }}
                                />

                                <div className="space-y-4 border-t pt-4">
                                  <Label htmlFor="review-notes">Review Notes</Label>
                                  <Textarea
                                    id="review-notes"
                                    placeholder="Add review notes..."
                                    value={reviewNotes}
                                    onChange={(e) => setReviewNotes(e.target.value)}
                                    rows={4}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={() => handleReviewAction("rejected")} variant="destructive">
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject
                                </Button>
                                <Button
                                  onClick={() => handleReviewAction("approved")}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Approve
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                        {article.status === "approved" && (
                          <Button variant="ghost" size="sm" onClick={() => handlePublish(article.id)}>
                            <Publish className="h-4 w-4" />
                            <span className="sr-only">Publish</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
