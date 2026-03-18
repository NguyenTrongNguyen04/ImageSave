"use client";

import * as React from "react";
import { ArrowRight, Shield } from "lucide-react";
import { useRouter } from "next/navigation";

import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiFetch, TokenResponse } from "@/lib/api";
import { setAccessToken } from "@/lib/auth";
import { API_BASE_URL, APP_NAME } from "@/lib/constants";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = React.useState("ntnmedia");
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
      const message = err instanceof Error ? err.message : "Đăng nhập thất bại";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Shield className="h-4 w-4" aria-hidden="true" />
            {APP_NAME}
          </div>
          <div className="ml-auto">
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 md:grid-cols-2 md:py-16">
        <section className="flex flex-col justify-center">
          <div className="max-w-md">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/70" />
              Riêng tư. Tối giản. Nhanh.
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight">
              Kho lưu trữ cá nhân.
            </h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Phân phối qua Mạng Kho riêng tư, lập chỉ mục cục bộ và hiển thị
              theo phong cách tinh gọn, cao cấp.
            </p>
            <div className="mt-6 text-sm text-muted-foreground">
              API:{" "}
              <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                {API_BASE_URL}
              </span>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <Card className="w-full max-w-md shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Đăng nhập</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username">Tài khoản</Label>
                  <Input
                    id="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ntnmedia"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full rounded-full"
                  disabled={submitting}
                >
                  {submitting ? "Đang đăng nhập…" : "Tiếp tục"}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
                <p className="text-xs text-muted-foreground">
                  Truy cập dạng doanh nghiệp với một tài khoản đặc quyền và phiên
                  đăng nhập được ký bảo mật.
                </p>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

