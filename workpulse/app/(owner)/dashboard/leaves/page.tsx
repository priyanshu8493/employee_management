"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { CalendarOff, Search } from "lucide-react";

export default function OwnerLeavesPage() {
  const [search, setSearch] = useState("");

  const { data: leaves, isLoading } = useQuery({
    queryKey: ["all-leaves"],
    queryFn: async () => {
      const res = await fetch("/api/leaves");
      const { data } = await res.json();
      return data || [];
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todayLeaves = (leaves || []).filter((l: any) => {
    const d = new Date(l.date);
    return d.getTime() === todayStart.getTime();
  });

  const upcomingLeaves = (leaves || []).filter((l: any) => {
    const d = new Date(l.date);
    return d > todayStart;
  }).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastLeaves = (leaves || []).filter((l: any) => {
    const d = new Date(l.date);
    return d < todayStart;
  });

  const filteredUpcoming = upcomingLeaves.filter((l: any) =>
    l.user?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const visibleLeaves = search
    ? [...todayLeaves, ...filteredUpcoming, ...pastLeaves].filter((l: any) =>
        l.user?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : leaves || [];

  const grouped = search
    ? { "All Leaves": visibleLeaves }
    : {
        "On Leave Today": todayLeaves,
        "Upcoming Leaves": upcomingLeaves,
        "Past Leaves": pastLeaves,
      };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Leaves</h1>
        <p className="text-muted-foreground mt-1">
          View all leaves across the organisation
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by employee name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-surface border-border text-foreground placeholder:text-muted-foreground max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-surface-raised rounded-xl animate-pulse" />
          ))}
        </div>
      ) : visibleLeaves.length === 0 && search ? (
        <Card className="border border-border p-8 rounded-xl">
          <div className="text-center">
            <CalendarOff className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No leaves match your search</p>
          </div>
        </Card>
      ) : (
        Object.entries(grouped).map(([sectionTitle, sectionLeaves]) =>
          sectionLeaves.length > 0 && (
            <div key={sectionTitle}>
              <div className="flex items-center gap-2 mb-4">
                <CalendarOff className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">{sectionTitle}</h2>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                  {sectionLeaves.length}
                </Badge>
              </div>
              <div className="space-y-2 mb-8">
                {(sectionLeaves as any[]).map((leave: any) => (
                  <Card
                    key={leave.id}
                    className="border border-border p-4 rounded-xl hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/20 text-primary text-sm">
                          {leave.user?.name?.split(" ").map((n: string) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground">{leave.user?.name}</p>
                          <span className="text-xs text-muted-foreground">
                            {leave.user?.team?.name || "No team"}
                          </span>
                        </div>
                        <p className="text-sm text-foreground mt-0.5">
                          {formatDate(leave.date)}
                        </p>
                        {leave.reason && (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {leave.reason}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          new Date(leave.date) > now
                            ? "border-primary/30 text-primary"
                            : new Date(leave.date).toDateString() === now.toDateString()
                            ? "border-warning/30 text-warning"
                            : "border-border text-muted-foreground"
                        }
                      >
                        {new Date(leave.date) > now
                          ? "Upcoming"
                          : new Date(leave.date).toDateString() === now.toDateString()
                          ? "Today"
                          : "Past"}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )
        )
      )}

      {!isLoading && leaves?.length === 0 && (
        <Card className="border border-border p-8 rounded-xl">
          <div className="text-center">
            <CalendarOff className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No Leaves Recorded</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Employees can mark their leaves from their Leaves page.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
