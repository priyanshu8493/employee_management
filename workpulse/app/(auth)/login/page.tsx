"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Clock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        console.error("Login error:", result.error);
        toast.error(result.error === "CredentialsSignin" ? "Invalid email or password" : "Login failed. Check console for details.");
        return;
      }

      const res = await fetch("/api/auth/session");
      const session = await res.json();

      if (session?.user?.role === "OWNER") {
        router.push("/dashboard");
      } else {
        router.push("/employee");
      }
    } catch (err) {
      console.error("Login exception:", err);
      toast.error("Something went wrong. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Clock className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome to WorkPulse</h1>
          <p className="text-muted-foreground mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              {...register("email")}
              className="bg-surface border-border text-foreground placeholder:text-muted-foreground"
            />
            {errors.email && (
              <p className="text-xs text-danger">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                {...register("password")}
                className="bg-surface border-border text-foreground placeholder:text-muted-foreground pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-danger">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          WorkPulse v1.0 — Employee Time Tracking
        </p>
      </div>
    </div>
  );
}
