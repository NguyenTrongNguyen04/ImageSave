"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, TokenResponse } from "@/lib/api";
import { setAccessToken } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/constants";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch<TokenResponse>(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setAccessToken(res.access_token);
      toast.success("Đăng nhập thành công");
      router.push("/vault");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Đăng nhập</CardTitle>
          <CardDescription>
            Nhập tên đăng nhập và mật khẩu để truy cập kho của bạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Tên đăng nhập hoặc email</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="tên_đăng_nhập"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Đang đăng nhập…" : "Đăng nhập"}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Chưa có tài khoản?{" "}
              <Link href="/signup" className="text-foreground underline underline-offset-4 hover:text-primary">
                Đăng ký ngay
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
