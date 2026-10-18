import { UploadPageCard } from "@/features/upload-manuscript/components/UploadPageCard";

export default function LibraryPage() {
  return (
    // UploadPageCard controls its own horizontal padding (px-10) to match the design
    <main className="min-h-screen">
      <UploadPageCard />
    </main>
  );
}
