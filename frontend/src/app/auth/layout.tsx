import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function AuthLayout({ children }: LayoutProps<"/auth">) {
  return (
    <div className="grid grid-cols-5">
      <div className="col-span-3">
        <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-mt-text sm:text-6xl lg:text-7xl">
            Manulator
          </h1>
          <p className="mt-4 max-w-xl text-lg text-mt-text-muted sm:text-xl">
            Analyze, translate and understand your manuscript with AI
          </p>
        </div>
      </div>
      <div className="col-span-2">
        <div className="flex min-h-screen items-center justify-start">
          <div className="w-full max-w-sm rounded-mt-lg border border-mt-border bg-mt-surface p-8 shadow-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
