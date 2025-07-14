"use client"

import type React from "react"
import { useAuth } from "@/hooks/use-auth"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { Loader2 } from "lucide-react"
import { redirect } from "next/navigation"
import { useEffect } from "react"
import { supabase } from "@/lib/supabase"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, loading } = useAuth()

  useEffect(() => {
    const checkDatabase = async () => {
      if (!loading && user) {
        try {
          const { error } = await supabase.from("user_profiles").select("id").eq("id", user.id).single()

          if (error && (error.code === "PGRST116" || error.message.includes("does not exist"))) {
            window.location.href = "/setup"
            return
          }
        } catch (error) {
          console.error("Database check error:", error)
          window.location.href = "/setup"
          return
        }
      }

      if (!loading && !user) {
        redirect("/auth/login")
      }
    }

    checkDatabase()
  }, [user, loading])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        <SidebarInset className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">{children}</div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
