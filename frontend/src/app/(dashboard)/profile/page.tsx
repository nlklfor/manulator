import { DisplayNameCard } from "@/features/profile/components/DisplayNameCard";

export default function ProfilePage() {
  return (
    <main className="min-h-screen">
      <header className="flex flex-col gap-1 px-10 pt-9 pb-5">
        <h1 className="text-[28px] leading-9 font-semibold text-mt-text">Your profile</h1>
        <p className="text-sm text-mt-text-muted">
          How you appear to the people you share manuscripts with.
        </p>
      </header>

      <div className="flex max-w-[800px] flex-col gap-5 px-10 pb-10">
        <DisplayNameCard />
      </div>
    </main>
  );
}
