"use client";

import * as React from "react";
import {
  CheckCircle2,
  CircleAlert,
  RotateCcw,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  apiFetch,
  VaultUploadResponse,
  MediaCreateResponse,
  MediaSyncRequest,
  UploadAuthResponse,
} from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import {
  API_BASE_URL,
  IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_URL_ENDPOINT,
} from "@/lib/constants";

type QueueItem = {
  id: string;
  file: File;
  kind: "image" | "video" | "file";
  status: "queued" | "uploading" | "syncing" | "done" | "error";
  progress: number;
  error?: string;
};

function uid() {
  return crypto.randomUUID();
}

async function uploadToVaultNetwork(params: {
  file: File;
  auth: UploadAuthResponse;
  onProgress: (pct: number) => void;
}): Promise<VaultUploadResponse> {
  if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_URL_ENDPOINT) {
    throw new Error(
      "Thiếu cấu hình Mạng Kho. Vui lòng đặt NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY và NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT trong web/.env.local.",
    );
  }

  const form = new FormData();
  form.append("file", params.file);
  form.append("fileName", params.file.name);
  form.append("publicKey", IMAGEKIT_PUBLIC_KEY);
  form.append("token", params.auth.token);
  form.append("expire", String(params.auth.expire));
  form.append("signature", params.auth.signature);

  // Use XHR for upload progress.
  const xhr = new XMLHttpRequest();
  const promise = new Promise<VaultUploadResponse>((resolve, reject) => {
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const pct = Math.round((e.loaded / e.total) * 100);
      params.onProgress(Math.min(99, Math.max(1, pct)));
    };
    xhr.onerror = () => reject(new Error("Lỗi mạng khi tải lên"));
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Tải lên thất bại (${xhr.status})`));
        return;
      }
      try {
        resolve(JSON.parse(xhr.responseText) as VaultUploadResponse);
      } catch {
        reject(new Error("Tải lên thất bại (phản hồi không hợp lệ)"));
      }
    };
  });

  xhr.open("POST", "https://upload.imagekit.io/api/v1/files/upload");
  xhr.send(form);
  return promise;
}

function inferFileType(file: File): "image" | "video" | "file" {
  const t = file.type || "";
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("video/")) return "video";
  return "file";
}

export function UploadDialog({ onUploaded }: { onUploaded: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setQueue([]);
      setBusy(false);
    }
  }, [open]);

  function addFiles(files: File[]) {
    const next = files.map<QueueItem>((f) => ({
      id: uid(),
      file: f,
      kind: inferFileType(f),
      status: "queued",
      progress: 0,
    }));
    setQueue((prev) => [...next, ...prev]);
  }

  async function processOne(itemId: string) {
    const token = getAccessToken();
    if (!token) {
      toast.error("Vui lòng đăng nhập trước");
      return;
    }
    try {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === itemId
            ? { ...q, status: "uploading", progress: 3, error: undefined }
            : q,
        ),
      );
      const auth = await apiFetch<UploadAuthResponse>(
        `${API_BASE_URL}/api/media/upload-auth`,
        { method: "GET", token },
      );

      const current = queue.find((q) => q.id === itemId);
      if (!current) return;

      const uploaded = await uploadToVaultNetwork({
        file: current.file,
        auth,
        onProgress: (pct) =>
          setQueue((prev) =>
            prev.map((q) => (q.id === itemId ? { ...q, progress: pct } : q)),
          ),
      });

      setQueue((prev) =>
        prev.map((q) => (q.id === itemId ? { ...q, status: "syncing", progress: 99 } : q)),
      );

      // Step 3: sync metadata to local DB for gallery
      const payload: MediaSyncRequest = {
        imagekit_file_id: uploaded.fileId,
        url: uploaded.url,
        file_name: uploaded.name,
        file_type: inferFileType(current.file),
        size_bytes: uploaded.size,
      };
      await apiFetch<MediaCreateResponse>(`${API_BASE_URL}/api/media/sync`, {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });

      setQueue((prev) =>
        prev.map((q) => (q.id === itemId ? { ...q, status: "done", progress: 100 } : q)),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Tải lên thất bại";
      setQueue((prev) =>
        prev.map((q) =>
          q.id === itemId ? { ...q, status: "error", error: msg } : q,
        ),
      );
    }
  }

  async function startUploadAll() {
    if (busy) return;
    const todo = queue.filter((q) => q.status === "queued" || q.status === "error");
    if (todo.length === 0) return;
    setBusy(true);
    try {
      for (const item of todo) {
        await processOne(item.id);
      }
      toast.custom(() => (
        <div className="surface animate-in fade-in-0 zoom-in-95 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-tight">
                Tải lên thành công
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Dữ liệu đã được đồng bộ vào kho và sẵn sàng để duyệt.
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-full animate-[pmv-progress_900ms_ease-out_forwards] bg-primary" />
              </div>
            </div>
          </div>
        </div>
      ));
      onUploaded();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="rounded-full">
            <UploadCloud className="mr-2 h-4 w-4" aria-hidden="true" />
            Tải lên
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadCloud className="h-4 w-4" aria-hidden="true" />
            Tải lên Kho
          </DialogTitle>
          <DialogDescription>
            Kéo thả file vào đây hoặc chọn từ thiết bị. Hệ thống sẽ tải lên qua
            Mạng Kho riêng tư và lập chỉ mục để bạn duyệt nhanh.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className="rounded-2xl border bg-card p-4"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files ?? []).filter(Boolean);
              if (files.length > 0) addFiles(files);
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <UploadCloud className="h-4 w-4" aria-hidden="true" />
                <span className="font-medium">Thả file để tải lên</span>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="file" className="sr-only">
                  Chọn file
                </Label>
                <Input
                  id="file"
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length > 0) addFiles(files);
                    e.currentTarget.value = "";
                  }}
                />
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Hỗ trợ ảnh và video. Theo dõi tiến trình theo từng file.
            </div>
          </div>

          {queue.length > 0 && (
            <div className="space-y-3">
              {queue.slice(0, 6).map((q) => {
                const icon =
                  q.kind === "image" ? (
                    <ImageIcon className="h-4 w-4" aria-hidden="true" />
                  ) : q.kind === "video" ? (
                    <FileVideo className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <UploadCloud className="h-4 w-4" aria-hidden="true" />
                  );
                return (
                  <div key={q.id} className="rounded-xl border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {icon}
                          <div className="truncate text-sm font-medium">{q.file.name}</div>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {(q.file.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                          {q.status === "queued"
                            ? "Đang chờ"
                            : q.status === "uploading"
                              ? "Đang tải lên"
                              : q.status === "syncing"
                                ? "Đang đồng bộ"
                                : q.status === "done"
                                  ? "Hoàn tất"
                                  : "Lỗi"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {q.status === "error" && (
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8 rounded-full"
                            onClick={() => void processOne(q.id)}
                            disabled={busy}
                            aria-label="Thử lại"
                          >
                            <RotateCcw className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        )}
                        {q.status === "done" && (
                          <CheckCircle2
                            className="h-5 w-5 text-foreground/70"
                            aria-hidden="true"
                          />
                        )}
                        {q.status === "uploading" || q.status === "syncing" ? (
                          <Loader2
                            className="h-4 w-4 animate-spin text-muted-foreground"
                            aria-hidden="true"
                          />
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3">
                      <Progress value={q.progress} />
                    </div>
                    {q.status === "error" && q.error && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-destructive">
                        <CircleAlert className="h-4 w-4" aria-hidden="true" />
                        <span className="truncate">{q.error}</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {queue.length > 6 && (
                <div className="text-center text-xs text-muted-foreground">
                  +{queue.length - 6} file khác trong hàng chờ…
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="secondary"
            className="rounded-full"
            onClick={() => setOpen(false)}
            disabled={busy}
          >
            Huỷ
          </Button>
          <Button
            className="rounded-full"
            onClick={() => void startUploadAll()}
            disabled={queue.length === 0 || busy}
          >
            {busy ? "Đang tải lên…" : "Tải lên"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

