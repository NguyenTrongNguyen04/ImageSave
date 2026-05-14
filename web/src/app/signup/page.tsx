import { Shield } from "lucide-react";
import { SignupForm } from "@/components/signup-form";
import { ModeToggle } from "@/components/mode-toggle";
import { APP_NAME } from "@/lib/constants";

export default function SignupPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Shield className="h-4 w-4" aria-hidden />
            {APP_NAME}
          </div>
          <div className="ml-auto">
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-4 py-12 md:grid-cols-2 md:py-16">
        <section className="flex flex-col justify-center">
          <div className="max-w-sm">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/70" />
              Miễn phí · Riêng tư · Không giới hạn
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight">
              Tạo kho<br />của riêng bạn.
            </h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Đăng ký miễn phí và bắt đầu lưu trữ ảnh & video cá nhân. Chỉ mình bạn mới xem được.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <SignupForm className="w-full max-w-sm" />
        </section>
      </main>
    </div>
  );
}
