"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  Home,
  Clock,
  History,
  User,
  LogOut,
  Menu,
  X,
  AlertTriangle,
  Users,
  CalendarOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

const employeeNavItems = [
  { href: "/employee", label: "Home", icon: Home },
  { href: "/employee/time", label: "My Time", icon: Clock },
  { href: "/employee/history", label: "History", icon: History },
  { href: "/employee/leaves", label: "Leaves", icon: CalendarOff },
  { href: "/employee/qc-flags", label: "QC Flags", icon: AlertTriangle },
  { href: "/employee/profile", label: "Profile", icon: User },
];

const teamLeaderNavItems = [
  ...employeeNavItems,
  { href: "/employee/team-tasks", label: "Team Tasks", icon: Users },
];

export function EmployeeSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const initials = session?.user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "E";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-surface-raised border border-border"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200",
        "lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-5 border-b border-sidebar-border">
          <Link href="/employee" className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg text-sidebar-foreground">WorkPulse</span>
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden text-sidebar-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {(session?.user?.role === "TEAM_LEADER" ? teamLeaderNavItems : employeeNavItems).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {session?.user?.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {session?.user?.role === "TEAM_LEADER" ? "Team Leader" : "Employee"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <ThemeToggle className="border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent" />
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
      )}
    </>
  );
}
