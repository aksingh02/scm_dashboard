// import { createClient } from "@supabase/supabase-js"

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// // Server-side client
// import { createServerClient } from "@supabase/ssr"
// import { cookies } from "next/headers"

// export async function createServerSupabaseClient() {
//   const cookieStore = await cookies()

//   return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
//     cookies: {
//       getAll() {
//         return cookieStore.getAll()
//       },
//       setAll(cookiesToSet) {
//         try {
//           cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
//         } catch {
//           // The `setAll` method was called from a Server Component.
//           // This can be ignored if you have middleware refreshing
//           // user sessions.
//         }
//       },
//     },
//   })
// }

// lib/supabase.ts

import { createClient } from "@supabase/supabase-js"
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs"
import type { NextApiRequest, NextApiResponse } from "next"

// Client-side Supabase instance
const supabaseUrl = "https://adogsfsdlrxzkkbfqhar.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkb2dzZnNkbHJ4emtrYmZxaGFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NzUwNDIsImV4cCI6MjA2ODA1MTA0Mn0.ZG1HMqezdVjDYHRzVNir-WFtVL7Jpj6wTahbxD2FyPg"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client for API routes and getServerSideProps
export function createServerSupabaseClient(req: NextApiRequest, res: NextApiResponse) {
  return createPagesServerClient({ req, res })
}


