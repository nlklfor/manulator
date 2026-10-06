import type { ReactNode } from "react";
import Link from "next/link";
import AuthSwitch from "@/features/auth/components/AuthSwitch";

type AuthShellProps = {
  children: ReactNode;
};

export default function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-mt-bg text-mt-text lg:grid lg:grid-cols-2">
      <aside className="relative hidden min-h-screen flex-col bg-mt-sunken px-8 py-6 lg:flex xl:px-12">
        <Link href="/auth" className="flex w-fit items-center gap-2 font-semibold">
          <span className="grid size-9 place-items-center rounded border border-dashed border-mt-border-strong font-mono text-[9px] font-normal text-mt-text-subtle">
            LOGO
          </span>
          <span>manulator</span>
        </Link>

        <div className="flex flex-1 items-center justify-center py-8">
          {/* TODO: add the manuscript illustration from the mockup to public/ */}
        </div>

        <div className="max-w-xl">
          <h2 className="font-transcription text-2xl text-mt-text xl:text-3xl">
            Read medieval manuscripts, line by line.
          </h2>
          <p className="mt-2 text-sm text-mt-text-muted">
            Upload a page scan and get a transcription you can correct, search and export.
          </p>
        </div>
      </aside>

      <section className="relative flex min-h-screen flex-col px-5 pb-6 pt-5 sm:px-10 lg:px-12 lg:pt-6 xl:px-16">
        <header className="flex items-center justify-between gap-4 lg:justify-end">
          <Link href="/auth" className="flex items-center gap-2 font-semibold lg:hidden">
            <span className="grid size-8 place-items-center rounded border border-dashed border-mt-border-strong font-mono text-[8px] font-normal text-mt-text-subtle">
              LOGO
            </span>
            <span>manulator</span>
          </Link>
          <AuthSwitch />
        </header>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8 sm:py-10">
          {children}
        </div>

        <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 pt-2 text-xs text-mt-text-subtle">
          <span>[University] · [Course] student project</span>
          <span>Privacy</span>
          <span>Terms</span>
          <span>Help</span>
        </footer>
      </section>
    </main>
  );
}
