"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, PenTool, CheckSquare, Users, TrendingUp, Clock } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

interface DashboardStats {
  totalArticles: number
  draftArticles: number
  pendingArticles: number
  publishedArticles: number
  totalUsers?: number
}

export default function DashboardPage() {
  const { profile, hasRole } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalArticles: 0,
    draftArticles: 0,
    pendingArticles: 0,
    publishedArticles: 0,
  })
  const [recentArticles, setRecentArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      fetchDashboardData()
    }
  }, [profile])

  const fetchDashboardData = async () => {
    if (!profile) return

    try {
      // Fetch user's articles
      const { data: userArticles } = await supabase.from("articles").select("*").eq("author_id", profile.id)

      // Fetch recent articles for display
      const { data: recent } = await supabase
        .from("articles")
        .select(`
          *,
          author:user_profiles!articles_author_id_fkey(full_name, email)
        `)
        .eq("author_id", profile.id)
        .order("updated_at", { ascending: false })
        .limit(5)

      const articleStats = {
        totalArticles: userArticles?.length || 0,
        draftArticles: userArticles?.filter((a) => a.status === "draft").length || 0,
        pendingArticles: userArticles?.filter((a) => a.status === "pending_review").length || 0,
        publishedArticles: userArticles?.filter((a) => a.status === "published").length || 0,
      }

      // If admin, fetch additional stats
      if (hasRole(["admin", "super_admin"])) {
        const { data: allUsers } = await supabase.from("user_profiles").select("*")

        setStats({
          ...articleStats,
          totalUsers: allUsers?.length || 0,
        })
      } else {
        setStats(articleStats)
      }

      setRecentArticles(recent || [])
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
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
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Welcome back, {profile?.full_name || "User"}!</h1>
        <p className="text-muted-foreground">Here's what's happening with your content today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalArticles}</div>
            <p className="text-xs text-muted-foreground">All your articles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <PenTool className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draftArticles}</div>
            <p className="text-xs text-muted-foreground">Work in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingArticles}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.publishedArticles}</div>
            <p className="text-xs text-muted-foreground">Live articles</p>
          </CardContent>
        </Card>
      </div>

      {hasRole(["admin", "super_admin"]) && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckSquare className="h-5 w-5" />
                Admin Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-start h-auto py-3">
                <Link href="/dashboard/admin/articles" className="flex flex-col items-start">
                  <span className="font-medium">Review Articles</span>
                  <span className="text-xs text-muted-foreground">Approve or reject submissions</span>
                </Link>
              </Button>
              {hasRole("super_admin") && (
                <>
                  <Button asChild variant="outline" className="w-full justify-start h-auto py-3 bg-transparent">
                    <Link href="/dashboard/admin/users" className="flex flex-col items-start">
                      <span className="font-medium">Manage Users</span>
                      <span className="text-xs text-muted-foreground">Control user roles and permissions</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start h-auto py-3 bg-transparent">
                    <Link href="/dashboard/admin/logs" className="flex flex-col items-start">
                      <span className="font-medium">Activity Logs</span>
                      <span className="text-xs text-muted-foreground">Monitor system activity</span>
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {stats.totalUsers && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">Registered users</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Articles</CardTitle>
        </CardHeader>
        <CardContent>
          {recentArticles.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No articles yet. Start writing your first article!</p>
              <Button asChild>
                <Link href="/dashboard/articles/create">Create Article</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentArticles.map((article) => (
                <div
                  key={article.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{article.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Updated {formatDistanceToNow(new Date(article.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge
                      variant={
                        article.status === "draft"
                          ? "secondary"
                          : article.status === "pending_review"
                            ? "default"
                            : article.status === "approved"
                              ? "default"
                              : article.status === "published"
                                ? "default"
                                : "secondary"
                      }
                    >
                      {article.status.replace("_", " ")}
                    </Badge>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/articles/${article.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
