"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
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

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const router = useRouter();
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    if (password.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch<TokenResponse>(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      });
      setAccessToken(res.access_token);
      toast.success("Tạo tài khoản thành công! Chào mừng bạn.");
      router.push("/vault");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đăng ký thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle className="text-xl">Tạo tài khoản</CardTitle>
        <CardDescription>
          Điền thông tin bên dưới để tạo kho lưu trữ cá nhân của bạn
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Tên đăng nhập</Label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              placeholder="ten_dang_nhap"
              pattern="^[a-zA-Z0-9_]+$"
              title="Chỉ dùng chữ, số và dấu gạch dưới"
              minLength={3}
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="ban@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Tối thiểu 6 ký tự.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-password">Xác nhận mật khẩu</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-foreground underline underline-offset-4 hover:text-primary">
              Đăng nhập
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
