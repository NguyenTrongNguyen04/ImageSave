export type TokenResponse = {
  access_token: string;
  token_type: "bearer";
};

export type UploadAuthResponse = {
  token: string;
  expire: number;
  signature: string;
};

export type MediaSyncRequest = {
  imagekit_file_id: string;
  url: string;
  file_name: string;
  file_type: string;
  size_bytes: number;
};

export type MediaCreateResponse = {
  id: number;
  message: string;
};

export type MediaItem = {
  id: number;
  imagekit_file_id: string;
  url: string;
  file_name: string;
  file_type: string;
  size_bytes: number;
  created_at: string;
};

// Minimal subset of the Vault Network upload response we need for sync
export type VaultUploadResponse = {
  fileId: string;
  name: string;
  url: string;
  size: number;
  fileType?: string;
};

export type MediaListResponse = {
  data: MediaItem[];
  total_items: number;
  total_pages: number;
  current_page: number;
};

export type MediaListQuery = {
  page: number;
  limit: number;
  q?: string;
  file_type?: "image" | "video" | "file";
  sort?: "created_desc" | "created_asc";
};

export class ApiError extends Error {
  readonly status: number;
  readonly payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function parseMaybeJson(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res.text();
}

export async function apiFetch<T>(
  url: string,
  init?: RequestInit & { token?: string | null },
): Promise<T> {
  const { token, headers, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: {
      ...(headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const payload = await parseMaybeJson(res);
    const message =
      typeof payload === "object" && payload && "detail" in payload
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          String((payload as any).detail)
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, payload);
  }
  return (await res.json()) as T;
}

