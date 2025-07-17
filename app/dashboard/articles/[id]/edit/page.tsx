"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { ArrowLeft, Save, Send, X } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import type { Article } from "@/lib/types"

// UUID validation function
const isValidUUID = (str: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export default function ArticleEditPage() {
  const params = useParams()
  const router = useRouter()
  const { user, profile } = useAuth()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [title, setTitle] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [content, setContent] = useState("")
  const [featuredImageUrl, setFeaturedImageUrl] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [metaTitle, setMetaTitle] = useState("")
  const [metaDescription, setMetaDescription] = useState("")

  useEffect(() => {
    const articleId = params.id as string

    // Validate UUID format
    if (!isValidUUID(articleId)) {
      toast.error("Invalid article ID")
      router.push("/dashboard/articles")
      return
    }

    if (articleId && user) {
      fetchArticle(articleId)
    }
  }, [params.id, user, router])

  const fetchArticle = async (articleId: string) => {
    try {
      const { data, error } = await supabase.from("articles").select("*").eq("id", articleId).single()

      if (error) {
        if (error.code === "PGRST116") {
          toast.error("Article not found")
        } else {
          throw error
        }
        router.push("/dashboard/articles")
        return
      }

      // Check if user can edit this article
      if (data.author_id !== user?.id) {
        toast.error("You don't have permission to edit this article")
        router.push("/dashboard/articles")
        return
      }

      // Check if article can be edited
      if (data.status !== "draft" && data.status !== "rejected") {
        toast.error("Only draft and rejected articles can be edited")
        router.push(`/dashboard/articles/${articleId}`)
        return
      }

      setArticle(data)

      // Populate form fields
      setTitle(data.title || "")
      setExcerpt(data.excerpt || "")
      setContent(data.content || "")
      setFeaturedImageUrl(data.featured_image_url || "")
      setTags(data.tags || [])
      setMetaTitle(data.meta_title || "")
      setMetaDescription(data.meta_description || "")
    } catch (error: any) {
      console.error("Error fetching article:", error)
      toast.error("Failed to load article")
      router.push("/dashboard/articles")
    } finally {
      setLoading(false)
    }
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleSave = async (status: "draft" | "pending_review") => {
    if (!article || !profile) return

    if (!title.trim()) {
      toast.error("Title is required")
      return
    }

    if (!content.trim()) {
      toast.error("Content is required")
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from("articles")
        .update({
          title: title.trim(),
          excerpt: excerpt.trim() || null,
          content: content.trim(),
          featured_image_url: featuredImageUrl.trim() || null,
          tags: tags.length > 0 ? tags : null,
          meta_title: metaTitle.trim() || null,
          meta_description: metaDescription.trim() || null,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", article.id)

      if (error) throw error

      // Log activity
      const action = status === "draft" ? "article_updated" : "article_submitted"
      await supabase.rpc("log_activity", {
        p_user_id: profile.id,
        p_action: action,
        p_resource_type: "article",
        p_resource_id: article.id,
        p_details: { title: title.trim() },
      })

      const message = status === "draft" ? "Article saved as draft" : "Article submitted for review"
      toast.success(message)
      router.push("/dashboard/articles")
    } catch (error: any) {
      console.error("Error saving article:", error)
      toast.error("Failed to save article")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!article) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Article not found or cannot be edited</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/articles">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Articles
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard/articles">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Articles
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Edit Article</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={() => handleSave("pending_review")} disabled={saving}>
            <Send className="h-4 w-4 mr-2" />
            Submit for Review
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Article Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter article title..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Brief description of the article..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="content">Content *</Label>
                <div className="mt-1">
                  <RichTextEditor
                    content={content}
                    onChange={setContent}
                    placeholder="Write your article content here..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Article Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="featured-image">Featured Image URL</Label>
                <Input
                  id="featured-image"
                  value={featuredImageUrl}
                  onChange={(e) => setFeaturedImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags</Label>
                <div className="mt-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      id="tags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Add a tag..."
                      className="flex-1"
                    />
                    <Button type="button" onClick={handleAddTag} size="sm">
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="meta-title">Meta Title</Label>
                <Input
                  id="meta-title"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="SEO title for search engines..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="meta-description">Meta Description</Label>
                <Textarea
                  id="meta-description"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="SEO description for search engines..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
