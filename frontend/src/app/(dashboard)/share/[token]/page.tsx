import { ShareLinkPreview } from "@/features/sharing/components/ShareLinkPreview";

// A share link: /share/<token>. Logged-out visitors are sent to the login page
// first and come back here afterwards (see src/proxy.ts).
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ShareLinkPreview token={token} />;
}
