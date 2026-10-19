// Workspace route: /manuscript/[id]
// This is a thin server component that passes the id to the WorkspacePage client component.
import { WorkspacePage } from "@/features/workspace/components/WorkspacePage";

interface ManuscriptPageProps {
  params: { id: string };
}

export default function ManuscriptPage({ params }: ManuscriptPageProps) {
  return <WorkspacePage manuscriptId={params.id} />;
}
