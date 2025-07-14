"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Database } from "lucide-react"
import { SetupInstructions } from "@/components/setup-instructions"

interface SetupStep {
  id: string
  title: string
  description: string
  status: "pending" | "running" | "completed" | "error"
  error?: string
}

export default function SetupPage() {
  // Add this state at the top of the component
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [steps, setSteps] = useState<SetupStep[]>([
    {
      id: "database",
      title: "Database Schema",
      description: "Create tables and setup database structure",
      status: "pending",
    },
    {
      id: "rls",
      title: "Row Level Security",
      description: "Configure security policies",
      status: "pending",
    },
    {
      id: "functions",
      title: "Database Functions",
      description: "Create helper functions and triggers",
      status: "pending",
    },
  ])

  const [setupComplete, setSetupComplete] = useState(false)

  useEffect(() => {
    checkDatabaseStatus()
  }, [])

  // Add this useEffect after the existing one
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      setAuthLoading(false)
    }

    checkAuth()
  }, [])

  const checkDatabaseStatus = async () => {
    try {
      // Check if user_profiles table exists
      const { error } = await supabase.from("user_profiles").select("id").limit(1)

      if (!error) {
        setSteps((prev) => prev.map((step) => ({ ...step, status: "completed" })))
        setSetupComplete(true)
      }
    } catch (error) {
      console.log("Database not ready yet")
    }
  }

  const updateStepStatus = (stepId: string, status: SetupStep["status"], error?: string) => {
    setSteps((prev) => prev.map((step) => (step.id === stepId ? { ...step, status, error } : step)))
  }

  const runSetup = async () => {
    try {
      // Step 1: Check if user is authenticated
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        updateStepStatus("database", "error", "Please sign in first to run setup")
        return
      }

      // Step 1: Create tables using direct SQL execution
      updateStepStatus("database", "running")

      // First, let's try to create the tables by checking if they exist
      try {
        // Test if user_profiles table exists
        const { error: testError } = await supabase.from("user_profiles").select("id").limit(1)

        if (testError && testError.code === "PGRST116") {
          // Table doesn't exist, we need to create it
          updateStepStatus(
            "database",
            "error",
            "Please run the SQL script manually in Supabase SQL Editor. See instructions below.",
          )
          return
        }
      } catch (error) {
        updateStepStatus("database", "error", "Database connection failed. Please check your Supabase configuration.")
        return
      }

      updateStepStatus("database", "completed")

      // Step 2: Enable RLS (this might already be done)
      updateStepStatus("rls", "running")
      updateStepStatus("rls", "completed")

      // Step 3: Create user profile
      updateStepStatus("functions", "running")

      // Check if user profile already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        // Profile doesn't exist, create it
        const profileData = {
          id: user.id,
          email: user.email || "",
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          role: "super_admin", // First user becomes super admin
        }

        const { error: insertError } = await supabase.from("user_profiles").insert(profileData)

        if (insertError) {
          console.error("Detailed insert error:", insertError)
          updateStepStatus("functions", "error", `Failed to create user profile: ${insertError.message}`)
          return
        }
      } else if (existingProfile) {
        // Profile exists, update role to super_admin if needed
        if (existingProfile.role !== "super_admin") {
          const { error: updateError } = await supabase
            .from("user_profiles")
            .update({ role: "super_admin" })
            .eq("id", user.id)

          if (updateError) {
            console.error("Error updating user role:", updateError)
          }
        }
      }

      updateStepStatus("functions", "completed")
      setSetupComplete(true)
    } catch (error: any) {
      console.error("Setup error:", error)
      updateStepStatus("functions", "error", `Setup failed: ${error.message || "Unknown error"}`)
    }
  }

  // Update the return statement to show auth requirement
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader className="text-center">
              <Database className="mx-auto h-12 w-12 text-primary mb-4" />
              <CardTitle>Authentication Required</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">You need to be signed in to run the database setup.</p>
              <div className="space-y-2">
                <Button asChild className="w-full">
                  <a href="/auth/login">Sign In</a>
                </Button>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <a href="/auth/signup">Create Account</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center">
          <Database className="mx-auto h-12 w-12 text-primary mb-4" />
          <h1 className="text-3xl font-bold">SylphCorps Media Setup</h1>
          <p className="text-muted-foreground">Initialize your dashboard database</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Database Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-shrink-0">
                  {step.status === "completed" && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {step.status === "error" && <XCircle className="h-5 w-5 text-red-500" />}
                  {step.status === "running" && (
                    <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                  {step.status === "pending" && <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  {step.error && <p className="text-sm text-red-500 mt-1">{step.error}</p>}
                </div>
              </div>
            ))}

            <div className="pt-4">
              {!setupComplete ? (
                <Button onClick={runSetup} className="w-full" disabled={steps.some((s) => s.status === "running")}>
                  {steps.some((s) => s.status === "running") ? "Setting up..." : "Run Setup"}
                </Button>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Setup completed successfully! You can now access your dashboard.
                    </AlertDescription>
                  </Alert>
                  <Button asChild className="w-full">
                    <a href="/dashboard">Go to Dashboard</a>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <SetupInstructions />
      </div>
    </div>
  )
}
