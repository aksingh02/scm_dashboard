"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import type { ActivityLog } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"

const actionColors = {
  article_drafted: "secondary",
  article_submitted: "default",
  article_approved: "default",
  article_rejected: "destructive",
  article_published: "default",
  user_role_updated: "secondary",
} as const

export default function ActivityLogsPage() {
  const { profile, hasRole } = useAuth()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile && hasRole("super_admin")) {
      fetchLogs()
    }
  }, [profile])

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select(`
          *,
          user:user_profiles!activity_logs_user_id_fkey(full_name, email, avatar_url)
        `)
        .order("created_at", { ascending: false })
        .limit(100)

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error("Error fetching activity logs:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!hasRole("super_admin")) {
    return <div>Access denied</div>
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Activity Logs</h1>
        <p className="text-muted-foreground">Monitor system activity and user actions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={log.user?.avatar_url || "/placeholder.svg"} />
                        <AvatarFallback>{log.user?.full_name?.charAt(0) || log.user?.email?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{log.user?.full_name || log.user?.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={actionColors[log.action as keyof typeof actionColors] || "secondary"}>
                      {log.action.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{log.resource_type}</TableCell>
                  <TableCell>
                    {log.details && (
                      <div className="text-sm text-muted-foreground">
                        {JSON.stringify(log.details, null, 2).slice(0, 100)}...
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
