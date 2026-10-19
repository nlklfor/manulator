import { WorkspacePage } from "@/features/workspace/components/WorkspacePage";

// In Next.js 15+ the route params are a Promise, so they must be awaited.
export default async function ManuscriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkspacePage manuscriptId={id} />;
}
