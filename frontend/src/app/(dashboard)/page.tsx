import { Suspense } from "react";
import { UploadPageCard } from "@/features/upload-manuscript/components/UploadPageCard";

export default function LibraryPage() {
  return (
    <main className="min-h-screen px-6 py-12">
      {/* The library reads the open folder from the address (?type=...), which needs Suspense */}
      <Suspense>
        <UploadPageCard />
      </Suspense>
    </main>
  );
}
