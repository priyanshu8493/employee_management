"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
  designation: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export default function EmployeeProfilePage() {
  const { data: session, update } = useSession();
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: session?.user?.name || "",
      phone: "",
      avatarUrl: "",
      designation: "",
    },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    },
  });

  const profileMutation = useMutation({
    mutationFn: async (data: { name: string; phone?: string; avatarUrl?: string; designation?: string }) => {
      const res = await fetch(`/api/employees/${session?.user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const { data: result, error } = await res.json();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      update();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await fetch(`/api/employees/${session?.user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: data.newPassword }),
      });
      const { data: result, error } = await res.json();
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      toast.success("Password changed");
      setShowPasswordForm(false);
      passwordForm.reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?";

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings</p>
      </div>

      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary text-primary-foreground text-lg">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-lg font-semibold text-foreground">{session?.user?.name}</p>
          <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
        </div>
      </div>

      <Card className="border border-border p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-foreground mb-4">Edit Profile</h3>
        <form
          onSubmit={profileForm.handleSubmit((data) => profileMutation.mutate(data))}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label className="text-foreground">Name</Label>
            <Input
              {...profileForm.register("name")}
              className="bg-surface border-border text-foreground"
            />
            {profileForm.formState.errors.name && (
              <p className="text-xs text-danger">{profileForm.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Designation</Label>
            <Input
              {...profileForm.register("designation")}
              placeholder="e.g. Software Engineer"
              className="bg-surface border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Phone</Label>
            <Input
              {...profileForm.register("phone")}
              placeholder="+1-555-0000"
              className="bg-surface border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Avatar URL</Label>
            <Input
              {...profileForm.register("avatarUrl")}
              placeholder="https://..."
              className="bg-surface border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={profileMutation.isPending}
          >
            {profileMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </Card>

      <Card className="border border-border p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-foreground mb-4">Password</h3>
        {showPasswordForm ? (
          <form
            onSubmit={passwordForm.handleSubmit((data) => passwordMutation.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label className="text-foreground">Current Password</Label>
              <Input
                type="password"
                {...passwordForm.register("currentPassword")}
                className="bg-surface border-border text-foreground"
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-xs text-danger">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">New Password</Label>
              <Input
                type="password"
                {...passwordForm.register("newPassword")}
                className="bg-surface border-border text-foreground"
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-xs text-danger">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPasswordForm(false)}
                className="border-border text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={passwordMutation.isPending}
              >
                {passwordMutation.isPending ? "Changing..." : "Change Password"}
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowPasswordForm(true)}
            className="border-border text-foreground"
          >
            Change Password
          </Button>
        )}
      </Card>
    </div>
  );
}
