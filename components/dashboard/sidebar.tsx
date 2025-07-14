"use client"

import { useAuth } from "@/hooks/use-auth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FileText, PenTool, Users, Settings, BarChart3, CheckSquare, LogOut, ChevronUp } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navigation = [
  {
    title: "Content",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: BarChart3,
        roles: ["author", "admin", "super_admin"],
      },
      {
        title: "My Articles",
        href: "/dashboard/articles",
        icon: FileText,
        roles: ["author", "admin", "super_admin"],
      },
      {
        title: "Create Article",
        href: "/dashboard/articles/create",
        icon: PenTool,
        roles: ["author", "admin", "super_admin"],
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        title: "Review Articles",
        href: "/dashboard/admin/articles",
        icon: CheckSquare,
        roles: ["admin", "super_admin"],
      },
      {
        title: "User Management",
        href: "/dashboard/admin/users",
        icon: Users,
        roles: ["super_admin"],
      },
      {
        title: "Activity Logs",
        href: "/dashboard/admin/logs",
        icon: BarChart3,
        roles: ["super_admin"],
      },
    ],
  },
]

export function DashboardSidebar() {
  const { profile, signOut, hasRole } = useAuth()
  const pathname = usePathname()

  const filteredNavigation = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.some((role) => hasRole(role))),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <Sidebar variant="inset" className="border-r">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="h-4 w-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">SylphCorps Media</span>
            <span className="truncate text-xs text-muted-foreground">Dashboard</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {filteredNavigation.map((group) => (
          <SidebarGroup key={group.title} className="mb-4">
            <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      className="w-full justify-start px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
                    >
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full justify-start px-3 py-2 h-auto">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} />
                    <AvatarFallback className="text-xs">
                      {profile?.full_name?.charAt(0) || profile?.email.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight min-w-0 ml-3">
                    <span className="truncate font-semibold">{profile?.full_name || "User"}</span>
                    <span className="truncate text-xs text-muted-foreground capitalize">
                      {profile?.role.replace("_", " ")}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4 flex-shrink-0" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width] mb-2" align="start">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="flex items-center">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
