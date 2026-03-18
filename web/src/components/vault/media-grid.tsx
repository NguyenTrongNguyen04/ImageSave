"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, MoreHorizontal, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiFetch, MediaItem, MediaListQuery, MediaListResponse } from "@/lib/api";
import { getAccessToken, clearAccessToken } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/constants";
import { VaultFilters, VaultToolbar } from "@/components/vault/vault-toolbar";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

export function MediaGrid() {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<MediaItem[]>([]);
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(30);
  const [hasMore, setHasMore] = React.useState(true);
  const [filters, setFilters] = React.useState<VaultFilters>({
    q: "",
    fileType: "all",
    sort: "created_desc",
  });
  const [confirmDelete, setConfirmDelete] = React.useState<MediaItem | null>(
    null,
  );
  const [viewer, setViewer] = React.useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  });
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const pageRef = React.useRef(page);
  const loadingRef = React.useRef(loading);
  const hasMoreRef = React.useRef(hasMore);

  React.useEffect(() => {
    pageRef.current = page;
  }, [page]);
  React.useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);
  React.useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const load = React.useCallback(
    async (opts?: { reset?: boolean }) => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      setItems([]);
      return;
    }
    const reset = opts?.reset ?? false;
    if (reset) {
      setLoading(true);
      setPage(1);
      setHasMore(true);
    }
    try {
      const query: MediaListQuery = {
        page: reset ? 1 : pageRef.current,
        limit,
        q: filters.q.trim() ? filters.q.trim() : undefined,
        file_type: filters.fileType === "all" ? undefined : filters.fileType,
        sort: filters.sort,
      };
      const qs = new URLSearchParams();
      qs.set("page", String(query.page));
      qs.set("limit", String(query.limit));
      if (query.q) qs.set("q", query.q);
      if (query.file_type) qs.set("file_type", query.file_type);
      if (query.sort) qs.set("sort", query.sort);
      const res = await apiFetch<MediaListResponse>(
        `${API_BASE_URL}/api/media?${qs.toString()}`,
        { method: "GET", token },
      );
      setItems((prev) => (reset ? res.data : [...prev, ...res.data]));
      setHasMore(res.current_page < res.total_pages);
      setPage((p) => (reset ? 2 : p + 1));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAccessToken();
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      } else {
        toast.error(err instanceof Error ? err.message : "Tải danh sách thất bại");
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
    },
    [filters.fileType, filters.q, filters.sort, limit],
  );

  React.useEffect(() => {
    const handle = window.setTimeout(() => void load({ reset: true }), 200);
    return () => window.clearTimeout(handle);
  }, [load, filters.q, filters.fileType, filters.sort]);

  React.useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (loadingRef.current || !hasMoreRef.current) return;
        void load();
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [load]);

  async function deleteItem(item: MediaItem) {
    const token = getAccessToken();
    if (!token) return;
    try {
      await apiFetch<{ message: string }>(
        `${API_BASE_URL}/api/media/${item.id}`,
        { method: "DELETE", token },
      );
      toast.success("Đã xoá");
      setItems((prev) => prev.filter((x) => x.id !== item.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xoá thất bại");
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 15 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="aspect-square w-full" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-10 text-center">
        <div className="mx-auto max-w-md">
          <div className="text-sm text-muted-foreground">Chưa có dữ liệu</div>
          <h2 className="mt-2 text-lg font-semibold tracking-tight">
            Kho của bạn đang trống.
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Tải ảnh/video lên Kho. Sau khi tải xong, hệ thống sẽ lập chỉ mục để
            bạn duyệt nhanh và mượt hơn.
          </p>
          <Button className="mt-6 rounded-full" onClick={() => void load()}>
            Tải lại
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <VaultToolbar value={filters} onChange={setFilters} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((m) => (
          <Card key={m.id} className="group overflow-hidden lift">
            <button
              type="button"
              className="relative aspect-square bg-muted text-left"
              onClick={() => setViewer({ open: true, index: items.findIndex((x) => x.id === m.id) })}
            >
              {m.file_type === "video" ? (
                <>
                  <video
                    src={m.url}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="rounded-full bg-background/80 p-2 shadow-sm ring-1 ring-foreground/10">
                      <Play className="h-4 w-4" aria-hidden="true" />
                    </div>
                  </div>
                </>
              ) : (
                <Image
                  src={m.url}
                  alt={m.file_name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 20vw"
                />
              )}
              <div className="absolute left-2 top-2">
                <Badge variant="secondary" className="rounded-full">
                  {m.file_type}
                </Badge>
              </div>
              <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 rounded-full shadow-sm"
                        aria-label="Media actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setConfirmDelete(m)}>
                      <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                      Xoá
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </button>
            <div className="space-y-1.5 p-3">
              <div className="truncate text-sm font-medium">{m.file_name}</div>
              <div className="text-xs text-muted-foreground">
                {formatBytes(m.size_bytes)}
              </div>
            </div>
          </Card>
        ))}
      </div>
      <div ref={sentinelRef} className="h-10" />
      {loading && items.length > 0 && (
        <div className="mt-4 text-center text-xs text-muted-foreground">Đang tải…</div>
      )}

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xoá mục này?</DialogTitle>
            <DialogDescription>
              Thao tác này sẽ xoá vĩnh viễn khỏi Kho và gỡ khỏi chỉ mục cục bộ.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="secondary"
              className="rounded-full"
              onClick={() => setConfirmDelete(null)}
            >
              Huỷ
            </Button>
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={() => {
                const item = confirmDelete;
                setConfirmDelete(null);
                if (item) void deleteItem(item);
              }}
            >
              Xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewer.open} onOpenChange={(open) => setViewer((v) => ({ ...v, open }))}>
        <DialogContent className="sm:max-w-3xl">
          {items[viewer.index] ? (
            <>
              <DialogHeader>
                <DialogTitle className="truncate">{items[viewer.index].file_name}</DialogTitle>
                <DialogDescription>
                  {items[viewer.index].file_type} · {formatBytes(items[viewer.index].size_bytes)}
                </DialogDescription>
              </DialogHeader>
              <div className="relative overflow-hidden rounded-xl border bg-muted">
                <div className="relative aspect-video">
                  {items[viewer.index].file_type === "video" ? (
                    <video
                      src={items[viewer.index].url}
                      className="h-full w-full"
                      controls
                      playsInline
                    />
                  ) : (
                    <Image
                      src={items[viewer.index].url}
                      alt={items[viewer.index].file_name}
                      fill
                      className="object-contain"
                      sizes="(max-width: 1024px) 100vw, 900px"
                    />
                  )}
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <div className="mr-auto flex gap-2">
                  <Button
                    variant="secondary"
                    className="rounded-full"
                    onClick={() => setViewer((v) => ({ ...v, index: Math.max(0, v.index - 1) }))}
                    disabled={viewer.index <= 0}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                    Trước
                  </Button>
                  <Button
                    variant="secondary"
                    className="rounded-full"
                    onClick={() =>
                      setViewer((v) => ({ ...v, index: Math.min(items.length - 1, v.index + 1) }))
                    }
                    disabled={viewer.index >= items.length - 1}
                  >
                    Sau
                    <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                <Button
                  variant="destructive"
                  className="rounded-full"
                  onClick={() => setConfirmDelete(items[viewer.index])}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Xoá
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Chưa chọn mục nào.</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

