"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, CheckCircle, XCircle, BookOpen, Search, Filter } from "lucide-react"
import { toast } from "sonner"
import type { Article } from "@/lib/types"

export default function AdminArticlesPage() {
  const { user, profile, isAdmin, isSuperAdmin } = useAuth()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [isReviewing, setIsReviewing] = useState(false)

  useEffect(() => {
    if (user && (isAdmin || isSuperAdmin)) {
      fetchArticles()
    }
  }, [user, isAdmin, isSuperAdmin])

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from("articles")
        .select(`
          *,
          author:user_profiles!articles_author_id_fkey(id, full_name, email),
          reviewer:user_profiles!articles_reviewed_by_fkey(id, full_name, email)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setArticles(data || [])
    } catch (error: any) {
      console.error("Error fetching articles:", error)
      toast.error("Failed to load articles")
    } finally {
      setLoading(false)
    }
  }

  const handleReviewAction = async (articleId: string, status: "approved" | "rejected") => {
    if (!profile) return

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
        .eq("id", articleId)

      if (error) throw error

      // Log activity
      await supabase.rpc("log_activity", {
        p_user_id: profile.id,
        p_action: `article_${status}`,
        p_resource_type: "article",
        p_resource_id: articleId,
        p_details: {
          title: selectedArticle?.title,
          review_notes: reviewNotes,
        },
      })

      toast.success(`Article ${status} successfully`)
      setReviewNotes("")
      setSelectedArticle(null)
      fetchArticles()
    } catch (error: any) {
      console.error("Error reviewing article:", error)
      toast.error(`Failed to ${status} article`)
    } finally {
      setIsReviewing(false)
    }
  }

  const handlePublish = async (articleId: string) => {
    if (!profile) return

    setIsReviewing(true)
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
        p_details: { title: selectedArticle?.title },
      })

      toast.success("Article published successfully!")
      setSelectedArticle(null)
      fetchArticles()
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

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.author?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.author?.email?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || article.status === statusFilter

    return matchesSearch && matchesStatus
  })

  if (!isAdmin && !isSuperAdmin) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Article Management</h1>
        <p className="text-muted-foreground">Review and manage all articles</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Articles ({filteredArticles.length})</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredArticles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all"
                  ? "No articles found matching your criteria."
                  : "No articles available."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArticles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{article.title}</p>
                        {article.excerpt && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{article.excerpt}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{article.author?.full_name || "Unknown"}</p>
                        <p className="text-muted-foreground">{article.author?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(article.status)}>{formatStatus(article.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(article.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(article.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedArticle(article)
                              setReviewNotes(article.review_notes || "")
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center justify-between">
                              <span>{selectedArticle?.title}</span>
                              <Badge className={getStatusColor(selectedArticle?.status || "")}>
                                {formatStatus(selectedArticle?.status || "")}
                              </Badge>
                            </DialogTitle>
                          </DialogHeader>

                          {selectedArticle && (
                            <div className="space-y-6">
                              <div className="text-sm text-muted-foreground">
                                <p>By: {selectedArticle.author?.full_name || selectedArticle.author?.email}</p>
                                <p>Created: {new Date(selectedArticle.created_at).toLocaleDateString()}</p>
                                {selectedArticle.updated_at !== selectedArticle.created_at && (
                                  <p>Updated: {new Date(selectedArticle.updated_at).toLocaleDateString()}</p>
                                )}
                              </div>

                              {selectedArticle.excerpt && (
                                <div>
                                  <h4 className="font-medium mb-2">Excerpt</h4>
                                  <p className="text-muted-foreground">{selectedArticle.excerpt}</p>
                                </div>
                              )}

                              {selectedArticle.featured_image_url && (
                                <div>
                                  <h4 className="font-medium mb-2">Featured Image</h4>
                                  <img
                                    src={selectedArticle.featured_image_url || "/placeholder.svg"}
                                    alt={selectedArticle.title}
                                    className="w-full h-48 object-cover rounded-lg"
                                  />
                                </div>
                              )}

                              <div>
                                <h4 className="font-medium mb-2">Content</h4>
                                <div
                                  className="prose max-w-none dark:prose-invert"
                                  dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
                                />
                              </div>

                              {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2">Tags</h4>
                                  <div className="flex flex-wrap gap-1">
                                    {selectedArticle.tags.map((tag, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {(selectedArticle.status === "pending_review" || selectedArticle.review_notes) && (
                                <div>
                                  <h4 className="font-medium mb-2">Review Notes</h4>
                                  <Textarea
                                    value={reviewNotes}
                                    onChange={(e) => setReviewNotes(e.target.value)}
                                    placeholder="Add review notes..."
                                    rows={3}
                                    disabled={selectedArticle.status !== "pending_review"}
                                  />
                                  {selectedArticle.reviewer && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                      Last reviewed by:{" "}
                                      {selectedArticle.reviewer.full_name || selectedArticle.reviewer.email}
                                    </p>
                                  )}
                                </div>
                              )}

                              <div className="flex justify-end gap-2 pt-4 border-t">
                                {selectedArticle.status === "pending_review" && (
                                  <>
                                    <Button
                                      onClick={() => handleReviewAction(selectedArticle.id, "approved")}
                                      disabled={isReviewing}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Approve
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleReviewAction(selectedArticle.id, "rejected")}
                                      disabled={isReviewing}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Reject
                                    </Button>
                                  </>
                                )}
                                {selectedArticle.status === "approved" && (
                                  <Button onClick={() => handlePublish(selectedArticle.id)} disabled={isReviewing}>
                                    <BookOpen className="h-4 w-4 mr-2" />
                                    Publish
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
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
