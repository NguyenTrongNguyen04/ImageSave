"use client";

import * as React from "react";
import { ArrowDownUp, Search, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type VaultFilters = {
  q: string;
  fileType: "all" | "image" | "video";
  sort: "created_desc" | "created_asc";
};

export function VaultToolbar({
  value,
  onChange,
}: {
  value: VaultFilters;
  onChange: (next: VaultFilters) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={value.q}
          onChange={(e) => onChange({ ...value, q: e.target.value })}
          placeholder="Tìm kiếm trong kho…"
          className="h-10 rounded-full pl-9 pr-10"
        />
        {value.q.length > 0 && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full"
            onClick={() => onChange({ ...value, q: "" })}
            aria-label="Xoá tìm kiếm"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1 rounded-full border bg-card p-1">
          <Toggle
            pressed={value.fileType === "all"}
            onPressedChange={() => onChange({ ...value, fileType: "all" })}
            className="rounded-full px-3 text-xs"
          >
            Tất cả
          </Toggle>
          <Toggle
            pressed={value.fileType === "image"}
            onPressedChange={() => onChange({ ...value, fileType: "image" })}
            className="rounded-full px-3 text-xs"
          >
            Ảnh
          </Toggle>
          <Toggle
            pressed={value.fileType === "video"}
            onPressedChange={() => onChange({ ...value, fileType: "video" })}
            className="rounded-full px-3 text-xs"
          >
            Video
          </Toggle>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="secondary" className="rounded-full">
                <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden="true" />
                Lọc
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onChange({ ...value, fileType: "all" })}>
              Tất cả
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChange({ ...value, fileType: "image" })}>
              Ảnh
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChange({ ...value, fileType: "video" })}>
              Video
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="secondary" className="rounded-full">
                <ArrowDownUp className="mr-2 h-4 w-4" aria-hidden="true" />
                Sắp xếp
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onChange({ ...value, sort: "created_desc" })}>
              Mới nhất
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChange({ ...value, sort: "created_asc" })}>
              Cũ nhất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

