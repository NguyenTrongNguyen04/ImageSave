"use client";

import * as React from "react";
import { LogOut, Settings, Shield } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { ModeToggle } from "@/components/mode-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { APP_NAME } from "@/lib/constants";
import { clearAccessToken } from "@/lib/auth";

export function AppShell({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link
            href="/vault"
            className="flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold tracking-tight text-foreground hover:bg-accent"
          >
            <Shield className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{APP_NAME}</span>
          </Link>

          <Separator orientation="vertical" className="h-6" />

          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link
              href="/vault"
              aria-current={pathname === "/vault" ? "page" : undefined}
              className={[
                "rounded-md px-3 py-1.5 transition-colors hover:bg-accent hover:text-foreground",
                pathname === "/vault"
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground",
              ].join(" ")}
            >
              Kho
            </Link>
            <Link
              href="/settings"
              aria-current={pathname === "/settings" ? "page" : undefined}
              className={[
                "rounded-md px-3 py-1.5 transition-colors hover:bg-accent hover:text-foreground",
                pathname === "/settings"
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground",
              ].join(" ")}
            >
              Cài đặt
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ModeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    aria-label="Account menu"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">A</AvatarFallback>
                    </Avatar>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      router.push("/settings");
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                    Cài đặt
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      clearAccessToken();
                      router.push("/login");
                      router.refresh();
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <div className="text-sm text-muted-foreground">Riêng tư</div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        </div>
        {children}
      </main>
    </div>
  );
}

