"use client";

import * as React from "react";

import { AppShell } from "@/components/shell/app-shell";
import { MediaGrid } from "@/components/vault/media-grid";
import { UploadDialog } from "@/components/vault/upload-dialog";

export default function VaultPage() {
  const [refreshKey, setRefreshKey] = React.useState(0);

  return (
    <AppShell title="Kho lưu trữ">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Kho riêng tư của bạn, phân phối qua Mạng Kho độc quyền.
        </div>

        <UploadDialog onUploaded={() => setRefreshKey((k) => k + 1)} />
      </div>

      <MediaGrid key={refreshKey} />
    </AppShell>
  );
}

