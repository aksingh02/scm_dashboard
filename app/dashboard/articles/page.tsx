"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import type { Article } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PenTool, Eye, Trash2 } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

const statusColors = {
  draft: "secondary",
  pending_review: "warning",
  approved: "success",
  rejected: "destructive",
  published: "default",
} as const

export default function ArticlesPage() {
  const { profile } = useAuth()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      fetchArticles()
    }
  }, [profile])

  const fetchArticles = async () => {
    if (!profile) return

    try {
      const { data, error } = await supabase
        .from("articles")
        .select(`
          *,
          author:user_profiles!articles_author_id_fkey(full_name, email),
          reviewer:user_profiles!articles_reviewed_by_fkey(full_name, email)
        `)
        .eq("author_id", profile.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setArticles(data || [])
    } catch (error) {
      console.error("Error fetching articles:", error)
    } finally {
      setLoading(false)
    }
  }

  const deleteArticle = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return

    try {
      const { error } = await supabase.from("articles").delete().eq("id", id)

      if (error) throw error

      setArticles((prev) => prev.filter((article) => article.id !== id))
    } catch (error) {
      console.error("Error deleting article:", error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Articles</h1>
          <p className="text-muted-foreground">Manage your articles and track their status</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/articles/create">
            <PenTool className="mr-2 h-4 w-4" />
            Create Article
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Articles ({articles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {articles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">You haven't created any articles yet.</p>
              <Button asChild>
                <Link href="/dashboard/articles/create">Create Your First Article</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
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
                    <TableCell>
                      <Badge variant={statusColors[article.status]}>{article.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>{formatDistanceToNow(new Date(article.created_at), { addSuffix: true })}</TableCell>
                    <TableCell>{formatDistanceToNow(new Date(article.updated_at), { addSuffix: true })}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/articles/${article.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {article.status === "draft" && (
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/articles/${article.id}/edit`}>
                              <PenTool className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteArticle(article.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
