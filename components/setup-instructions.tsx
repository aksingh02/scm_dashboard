"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Copy, ExternalLink, CheckCircle } from "lucide-react"

const SQL_SCRIPT = `-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'author' CHECK (role IN ('author', 'admin', 'super_admin')),
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create articles table
CREATE TABLE IF NOT EXISTS public.articles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    excerpt TEXT,
    featured_image_url TEXT,
    author_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'published')),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_by UUID REFERENCES public.user_profiles(id),
    review_notes TEXT,
    tags TEXT[] DEFAULT '{}',
    meta_title TEXT,
    meta_description TEXT
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Basic policies
CREATE POLICY "Users can manage their own profile" ON public.user_profiles
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Authors can manage their own articles" ON public.articles
    FOR ALL USING (author_id = auth.uid());

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        CASE 
            WHEN NOT EXISTS (SELECT 1 FROM public.user_profiles) THEN 'super_admin'
            ELSE 'author'
        END
    );
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`

export function SetupInstructions() {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(SQL_SCRIPT)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Manual Database Setup
          <Badge variant="outline">Recommended</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>Follow these steps to set up your database manually in Supabase:</AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
              1
            </div>
            <div>
              <p className="font-medium">Open Supabase Dashboard</p>
              <p className="text-sm text-muted-foreground">Go to your Supabase project dashboard</p>
              <Button variant="outline" size="sm" className="mt-2 bg-transparent" asChild>
                <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                  Open Supabase <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
              2
            </div>
            <div>
              <p className="font-medium">Navigate to SQL Editor</p>
              <p className="text-sm text-muted-foreground">Click on "SQL Editor" in the left sidebar</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
              3
            </div>
            <div className="flex-1">
              <p className="font-medium">Copy and Run SQL Script</p>
              <p className="text-sm text-muted-foreground mb-3">
                Copy the script below and paste it into the SQL Editor, then click "Run"
              </p>

              <div className="relative">
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto max-h-64 border">
                  <code>{SQL_SCRIPT}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 bg-transparent"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <>
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-3 w-3" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
              4
            </div>
            <div>
              <p className="font-medium">Create Your Account</p>
              <p className="text-sm text-muted-foreground">
                After running the script, create your account. The first user will automatically become a super admin.
              </p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" asChild>
                  <a href="/auth/signup">Sign Up</a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="/auth/login">Sign In</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
