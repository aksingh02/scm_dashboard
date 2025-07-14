"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { usePathname } from "next/navigation"

export function DashboardHeader() {
  const pathname = usePathname()

  const generateBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean)
    const breadcrumbs = []

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      const href = "/" + segments.slice(0, i + 1).join("/")
      const isLast = i === segments.length - 1

      let title = segment.charAt(0).toUpperCase() + segment.slice(1)
      if (title === "Dashboard") title = "Dashboard"
      if (title === "Articles") title = "Articles"
      if (title === "Create") title = "Create Article"
      if (title === "Admin") title = "Administration"
      if (title === "Users") title = "User Management"
      if (title === "Logs") title = "Activity Logs"

      breadcrumbs.push({
        title,
        href,
        isLast,
      })
    }

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      <SidebarTrigger className="-ml-1 md:hidden" />
      <Separator orientation="vertical" className="mr-2 h-4 md:hidden" />

      <div className="flex-1">
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((breadcrumb, index) => (
              <div key={breadcrumb.href} className="flex items-center">
                {index > 0 && <BreadcrumbSeparator className="hidden sm:block" />}
                <BreadcrumbItem>
                  {breadcrumb.isLast ? (
                    <BreadcrumbPage className="font-medium">{breadcrumb.title}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={breadcrumb.href} className="transition-colors hover:text-foreground">
                      {breadcrumb.title}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Optional: Add header actions here */}
      <div className="flex items-center gap-2">
        {/* You can add notifications, search, or other header actions here */}
      </div>
    </header>
  )
}
