// Placeholder for the full-text manuscript search page.
// The search feature will query transcriptions via the backend once
// the HTR pipeline is in place (blocked on manuscript processing).
export default function SearchPage() {
  return (
    <main className="min-h-screen px-10 py-9">
      <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.01em] text-mt-text">
        Search
      </h1>
      <p className="mt-1 text-sm text-mt-text-muted">
        Full-text search through transcriptions &mdash; coming soon.
      </p>
    </main>
  );
}
