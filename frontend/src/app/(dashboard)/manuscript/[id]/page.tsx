// Workspace route: /manuscript/[id]
// In Next.js 15+, params is a Promise and must be awaited.
import { WorkspacePage } from "@/features/workspace/components/WorkspacePage";

interface ManuscriptPageProps {
  params: Promise<{ id: string }>;
}

export default async function ManuscriptPage({ params }: ManuscriptPageProps) {
  const { id } = await params;
  return <WorkspacePage manuscriptId={id} />;
}
