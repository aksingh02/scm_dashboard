"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import type { Article } from "@/lib/types"

export default function EditArticlePage() {
  const { id } = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    excerpt: "",
    featured_image_url: "",
    meta_title: "",
    meta_description: "",
    tags: [] as string[],
  })
  const [tagInput, setTagInput] = useState("")
  const [originalArticle, setOriginalArticle] = useState<Article | null>(null)

  useEffect(() => {
    if (id && profile) {
      fetchArticle()
    }
  }, [id, profile])

  const fetchArticle = async () => {
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("id", id as string)
        .single()

      if (error) throw error

      if (data && data.author_id === profile?.id && data.status === "draft") {
        setOriginalArticle(data)
        setFormData({
          title: data.title,
          content: data.content,
          excerpt: data.excerpt || "",
          featured_image_url: data.featured_image_url || "",
          meta_title: data.meta_title || "",
          meta_description: data.meta_description || "",
          tags: data.tags || [],
        })
      } else {
        toast.error("Article not found or not authorized for editing.")
        router.push("/dashboard/articles")
      }
    } catch (error) {
      console.error("Error fetching article for edit:", error)
      toast.error("Failed to load article for editing.")
      router.push("/dashboard/articles")
    } finally {
      setLoading(false)
    }
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .trim()
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }))
      setTagInput("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }))
  }

  const handleSubmit = async (status: "draft" | "pending_review") => {
    if (!profile || !originalArticle) return

    setLoading(true)
    try {
      const slug = generateSlug(formData.title)

      const { error } = await supabase
        .from("articles")
        .update({
          title: formData.title,
          slug,
          content: formData.content,
          excerpt: formData.excerpt,
          featured_image_url: formData.featured_image_url || null,
          status,
          tags: formData.tags,
          meta_title: formData.meta_title || null,
          meta_description: formData.meta_description || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", originalArticle.id)

      if (error) throw error

      // Log activity
      await supabase.rpc("log_activity", {
        p_user_id: profile.id,
        p_action: status === "draft" ? "article_updated_draft" : "article_resubmitted",
        p_resource_type: "article",
        p_resource_id: originalArticle.id,
        p_details: { title: formData.title },
      })

      toast.success(status === "draft" ? "Article draft updated" : "Article resubmitted for review")

      router.push("/dashboard/articles")
    } catch (error) {
      console.error("Error updating article:", error)
      toast.error("Failed to update article")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading article for editing...</div>
  }

  if (!originalArticle) {
    return (
      <div className="flex justify-center items-center h-64 text-muted-foreground">
        Article not found or unauthorized for editing.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Edit Article</h1>
          <p className="text-muted-foreground">Modify your article content and settings</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Article
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Article Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter article title..."
                />
              </div>

              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Brief description of the article..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Content</Label>
                <RichTextEditor
                  content={formData.content}
                  onChange={(content) => setFormData((prev) => ({ ...prev, content }))}
                  placeholder="Start writing your article..."
                />
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
                <Label htmlFor="featured_image">Featured Image URL</Label>
                <Input
                  id="featured_image"
                  value={formData.featured_image_url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, featured_image_url: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag} size="sm">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                    </Badge>
                  ))}
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
                <Label htmlFor="meta_title">Meta Title</Label>
                <Input
                  id="meta_title"
                  value={formData.meta_title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, meta_title: e.target.value }))}
                  placeholder="SEO title..."
                />
              </div>

              <div>
                <Label htmlFor="meta_description">Meta Description</Label>
                <Textarea
                  id="meta_description"
                  value={formData.meta_description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, meta_description: e.target.value }))}
                  placeholder="SEO description..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => handleSubmit("pending_review")}
              disabled={loading || !formData.title || !formData.content}
            >
              Resubmit for Review
            </Button>
            <Button variant="outline" onClick={() => handleSubmit("draft")} disabled={loading || !formData.title}>
              Save Draft Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
