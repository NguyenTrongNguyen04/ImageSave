"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  CircleAlert,
  RotateCcw,
  Trash2,
  UploadCloud,
  FileVideo,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

/* ------------------------------------------------------------------ */
/* Types                                                                 */
/* ------------------------------------------------------------------ */

type FileKind = "image" | "video" | "file";
type FileStatus = "queued" | "uploading" | "syncing" | "done" | "error";

interface QueueItem {
  id: string;
  file: File;
  kind: FileKind;
  preview?: string;
  status: FileStatus;
  progress: number;
  error?: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                               */
/* ------------------------------------------------------------------ */

function uid() {
  return crypto.randomUUID();
}

function inferKind(file: File): FileKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

function readableSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

async function uploadToImageKit(params: {
  file: File;
  auth: UploadAuthResponse;
  onProgress: (pct: number) => void;
}): Promise<VaultUploadResponse> {
  if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_URL_ENDPOINT) {
    throw new Error(
      "Thiếu cấu hình ImageKit. Vui lòng kiểm tra biến môi trường.",
    );
  }

  const form = new FormData();
  form.append("file", params.file);
  form.append("fileName", params.file.name);
  form.append("publicKey", IMAGEKIT_PUBLIC_KEY);
  form.append("token", params.auth.token);
  form.append("expire", String(params.auth.expire));
  form.append("signature", params.auth.signature);

  return new Promise<VaultUploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        params.onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
      }
    };
    xhr.onerror = () => reject(new Error("Lỗi mạng khi tải lên"));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as VaultUploadResponse);
        } catch {
          reject(new Error("Phản hồi không hợp lệ từ máy chủ"));
        }
      } else {
        reject(new Error(`Tải lên thất bại (${xhr.status})`));
      }
    };
    xhr.open("POST", "https://upload.imagekit.io/api/v1/files/upload");
    xhr.send(form);
  });
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                        */
/* ------------------------------------------------------------------ */

function DropZone({
  onFiles,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  function handleDrag(e: React.DragEvent, over: boolean) {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragging(over);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
    );
    if (files.length > 0) onFiles(files);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onFiles(files);
    e.currentTarget.value = "";
  }

  return (
    <div
      onDragOver={(e) => handleDrag(e, true)}
      onDragEnter={(e) => handleDrag(e, true)}
      onDragLeave={(e) => handleDrag(e, false)}
      onDragEnd={(e) => handleDrag(e, false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={[
        "relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-150 select-none",
        dragging
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-border hover:border-primary/50 hover:bg-muted/40",
        disabled && "pointer-events-none opacity-50",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="sr-only"
        disabled={disabled}
        onChange={handleInput}
      />

      <motion.div
        animate={dragging ? { scale: 1.15, rotate: -4 } : { scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground shadow-sm"
      >
        <UploadCloud className="size-7" aria-hidden />
      </motion.div>

      <div>
        <p className="text-sm font-semibold text-foreground">
          <span className="text-primary">Nhấn để chọn</span> hoặc kéo thả vào đây
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Hỗ trợ ảnh và video · Không giới hạn số lượng
        </p>
      </div>
    </div>
  );
}

function FileRow({
  item,
  onDelete,
  onRetry,
}: {
  item: QueueItem;
  onDelete: () => void;
  onRetry: () => void;
}) {
  const statusLabel: Record<FileStatus, string> = {
    queued: "Đang chờ",
    uploading: "Đang tải lên",
    syncing: "Đang đồng bộ",
    done: "Hoàn tất",
    error: "Thất bại",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      className={[
        "relative overflow-hidden rounded-xl border p-3 transition-colors",
        item.status === "error" ? "border-destructive/40 bg-destructive/5" : "bg-card",
      ].join(" ")}
    >
      {/* Progress fill background */}
      {(item.status === "uploading" || item.status === "syncing") && (
        <motion.div
          className="absolute inset-0 bg-primary/5"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: item.progress / 100 }}
          style={{ originX: 0 }}
          transition={{ duration: 0.2 }}
        />
      )}

      <div className="relative flex items-center gap-3">
        {/* Thumbnail or icon */}
        <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
          {item.preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.preview}
              alt={item.file.name}
              className="size-full object-cover"
            />
          ) : item.kind === "video" ? (
            <div className="flex size-full items-center justify-center">
              <FileVideo className="size-5 text-muted-foreground" aria-hidden />
            </div>
          ) : (
            <div className="flex size-full items-center justify-center">
              <ImageIcon className="size-5 text-muted-foreground" aria-hidden />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.file.name}</p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{readableSize(item.file.size)}</span>
            <span>·</span>
            <span
              className={
                item.status === "done"
                  ? "text-green-600 dark:text-green-400 font-medium"
                  : item.status === "error"
                    ? "text-destructive font-medium"
                    : ""
              }
            >
              {statusLabel[item.status]}
              {(item.status === "uploading") &&
                item.progress > 0 &&
                ` ${item.progress}%`}
            </span>
          </div>

          {/* Progress bar */}
          {(item.status === "uploading" || item.status === "syncing" || item.status === "done") && (
            <div className="mt-1.5">
              <Progress value={item.progress} className="h-1" />
            </div>
          )}

          {/* Error message */}
          {item.status === "error" && item.error && (
            <p className="mt-1 truncate text-xs text-destructive">{item.error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          {item.status === "done" && (
            <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" aria-hidden />
          )}
          {item.status === "error" && (
            <>
              <CircleAlert className="size-4 text-destructive" aria-hidden />
              <button
                onClick={onRetry}
                className="flex size-7 items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
                aria-label="Thử lại"
              >
                <RotateCcw className="size-3.5" aria-hidden />
              </button>
            </>
          )}
          {(item.status === "queued" || item.status === "error") && (
            <button
              onClick={onDelete}
              className="flex size-7 items-center justify-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Xoá"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                        */
/* ------------------------------------------------------------------ */

export function UploadDialog({ onUploaded }: { onUploaded: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      queue.forEach((q) => q.preview && URL.revokeObjectURL(q.preview));
      setQueue([]);
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function addFiles(files: File[]) {
    const items = files.map<QueueItem>((f) => ({
      id: uid(),
      file: f,
      kind: inferKind(f),
      preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
      status: "queued",
      progress: 0,
    }));
    setQueue((prev) => [...prev, ...items]);
  }

  function removeItem(id: string) {
    setQueue((prev) => {
      const item = prev.find((q) => q.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((q) => q.id !== id);
    });
  }

  function updateItem(id: string, patch: Partial<QueueItem>) {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  async function processOne(itemId: string) {
    const token = getAccessToken();
    if (!token) {
      toast.error("Vui lòng đăng nhập trước");
      return;
    }

    const current = queue.find((q) => q.id === itemId);
    if (!current) return;

    try {
      updateItem(itemId, { status: "uploading", progress: 3, error: undefined });

      const auth = await apiFetch<UploadAuthResponse>(
        `${API_BASE_URL}/api/media/upload-auth`,
        { method: "GET", token },
      );

      const uploaded = await uploadToImageKit({
        file: current.file,
        auth,
        onProgress: (pct) => updateItem(itemId, { progress: pct }),
      });

      updateItem(itemId, { status: "syncing", progress: 99 });

      const payload: MediaSyncRequest = {
        imagekit_file_id: uploaded.fileId,
        url: uploaded.url,
        file_name: uploaded.name,
        file_type: inferKind(current.file),
        size_bytes: uploaded.size,
      };
      await apiFetch<MediaCreateResponse>(`${API_BASE_URL}/api/media/sync`, {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });

      updateItem(itemId, { status: "done", progress: 100 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Tải lên thất bại";
      updateItem(itemId, { status: "error", error: msg });
    }
  }

  async function startAll() {
    if (busy) return;
    const todo = queue.filter((q) => q.status === "queued" || q.status === "error");
    if (todo.length === 0) return;

    setBusy(true);
    try {
      for (const item of todo) {
        await processOne(item.id);
      }
      const doneCount = queue.filter((q) => q.status === "done").length + todo.length;
      toast.custom(() => (
        <div className="surface animate-in fade-in-0 zoom-in-95 rounded-2xl border bg-background px-4 py-3 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="size-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Tải lên thành công</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {doneCount} file đã được đồng bộ vào kho.
              </p>
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

  const pendingCount = queue.filter(
    (q) => q.status === "queued" || q.status === "error",
  ).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="rounded-full gap-2">
            <UploadCloud className="size-4" aria-hidden />
            Tải lên
          </Button>
        }
      />

      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <UploadCloud className="size-4" aria-hidden />
            Tải lên Kho
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4 gap-4">
          {/* Drop zone */}
          <DropZone onFiles={addFiles} disabled={busy} />

          {/* File list */}
          <AnimatePresence initial={false}>
            {queue.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {queue.length} file đã chọn
                  </p>
                  {!busy && (
                    <button
                      onClick={() => {
                        queue.forEach((q) => q.preview && URL.revokeObjectURL(q.preview));
                        setQueue([]);
                      }}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Xoá tất cả
                    </button>
                  )}
                </div>

                <ul className="flex flex-col gap-2">
                  <AnimatePresence initial={false}>
                    {queue.map((item) => (
                      <FileRow
                        key={item.id}
                        item={item}
                        onDelete={() => removeItem(item.id)}
                        onRetry={() => void processOne(item.id)}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t px-5 py-3 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            className="rounded-full"
            onClick={() => setOpen(false)}
            disabled={busy}
          >
            Huỷ
          </Button>
          <Button
            className="rounded-full"
            onClick={() => void startAll()}
            disabled={pendingCount === 0 || busy}
          >
            {busy
              ? "Đang tải lên…"
              : pendingCount > 0
                ? `Tải lên ${pendingCount} file`
                : "Tải lên"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
