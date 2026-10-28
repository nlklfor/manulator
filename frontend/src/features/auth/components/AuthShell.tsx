import type { ReactNode } from "react";
import Link from "next/link";
import AuthSwitch from "@/features/auth/components/AuthSwitch";
import { LogoMark } from "@/components/ui/LogoMark";

type AuthShellProps = {
  children: ReactNode;
};

export default function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-mt-bg text-mt-text lg:grid lg:grid-cols-2">
      <aside className="relative hidden min-h-screen flex-col overflow-hidden bg-mt-sunken px-8 py-6 lg:flex xl:px-12">
        <Link href="/auth" className="relative flex w-fit items-center gap-2 font-semibold">
          <LogoMark className="size-9" />
          <span>manulator</span>
        </Link>

        {/* Intro animation (4:5, 1080 x 1350): fills the space between the logo and the text,
            as wide as the whole panel and never cropped. Its background has the colour of the
            panel, so its edges are not visible. It plays once and stays on its last picture (the
            logo). With "reduce motion" turned on in the system, only that picture is shown. */}
        <div aria-hidden="true" className="relative -mx-8 my-4 min-h-0 flex-1 xl:-mx-12">
          <video
            tabIndex={-1}
            autoPlay
            muted
            playsInline
            preload="auto"
            poster="/manulator-intro-poster.jpg"
            className="absolute inset-0 size-full object-contain motion-reduce:hidden"
          >
            <source src="/manulator-intro.mp4" type="video/mp4" />
          </video>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/manulator-intro-poster.jpg"
            alt=""
            className="absolute inset-0 hidden size-full object-contain motion-reduce:block"
          />
        </div>

        <div className="relative max-w-xl">
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
            <LogoMark className="size-8" />
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
