"use client";

import * as React from "react";
import { CheckCircle2, ExternalLink, Info, XCircle } from "lucide-react";

import { AppShell } from "@/components/shell/app-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";

type Status = "idle" | "checking" | "ok" | "error";

export default function SettingsPage() {
  const [status, setStatus] = React.useState<Status>("idle");
  const [detail, setDetail] = React.useState<string>("");

  async function check() {
    setStatus("checking");
    setDetail("");
    try {
      const res = await apiFetch<{ status: string; docs: string; openapi: string }>(
        `${API_BASE_URL}/`,
        { method: "GET" },
      );
      setStatus("ok");
      setDetail(
        JSON.stringify(
          {
            api_base_url: API_BASE_URL,
            api_status: res.status,
            docs: `${API_BASE_URL}${res.docs}`,
            openapi: `${API_BASE_URL}${res.openapi}`,
          },
          null,
          2,
        ),
      );
    } catch (err) {
      setStatus("error");
      setDetail(err instanceof Error ? err.message : "Connectivity check failed");
    }
  }

  React.useEffect(() => {
    void check();
  }, []);

  const pill =
    status === "ok" ? (
      <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        Đã kết nối
      </div>
    ) : status === "error" ? (
      <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
        <XCircle className="h-4 w-4" aria-hidden="true" />
        Mất kết nối
      </div>
    ) : (
      <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
        <Info className="h-4 w-4" aria-hidden="true" />
        Đang kiểm tra…
      </div>
    );

  return (
    <AppShell title="Cài đặt">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Môi trường & kết nối cho Mạng Kho riêng tư của bạn.
        </div>
        {pill}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Máy chủ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              API base URL
              <div className="mt-1 rounded-lg border bg-muted/30 px-3 py-2 font-mono text-xs">
                {API_BASE_URL}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                className="rounded-full"
                onClick={() => void check()}
                disabled={status === "checking"}
              >
                Kiểm tra lại
              </Button>
              <a
                href={`${API_BASE_URL}/docs`}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "secondary", className: "rounded-full" })}
              >
                Tài liệu API
                <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Chẩn đoán</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={detail}
              readOnly
              className="min-h-40 resize-none font-mono text-xs"
              placeholder="Trạng thái sẽ hiển thị ở đây…"
            />
            <div className="text-xs text-muted-foreground">
              Gợi ý: đặt{" "}
              <span className="font-mono">NEXT_PUBLIC_API_BASE_URL</span> trong{" "}
              <span className="font-mono">web/.env.local</span>.
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

