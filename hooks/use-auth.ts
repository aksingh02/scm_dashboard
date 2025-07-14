"use client"

import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import type { UserProfile } from "@/lib/types"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("user_profiles").select("*").eq("id", userId).single()

      if (error) {
        // If the table doesn't exist yet, create a temporary profile
        if (error.code === "PGRST116" || error.message.includes("does not exist")) {
          console.warn("Database not set up yet. Using temporary profile.")
          setProfile({
            id: userId,
            email: user?.email || "",
            role: "author",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as UserProfile)
          return
        }
        throw error
      }
      setProfile(data)
    } catch (error) {
      console.error("Error fetching profile:", error)
      // Fallback to basic profile if database isn't ready
      if (user) {
        setProfile({
          id: userId,
          email: user.email || "",
          role: "author",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as UserProfile)
      }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const hasRole = (roles: string | string[]) => {
    if (!profile) return false
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(profile.role)
  }

  return {
    user,
    profile,
    loading,
    signOut,
    hasRole,
    isAuthor: hasRole("author"),
    isAdmin: hasRole(["admin", "super_admin"]),
    isSuperAdmin: hasRole("super_admin"),
  }
}
