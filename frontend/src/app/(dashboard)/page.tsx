import { UploadPageCard } from "@/features/upload-manuscript/components/UploadPageCard";

export default function UploadPage() {
    return (
        <main className="min-h-screen bg-stone-50 px-6 py-12">
            <div className="mx-auto max-w-5xl">
                <h1 className="text-2xl font-semibold text-stone-900">All pages</h1>
                <p className="mt-1 text-sm text-stone-600">No pages yet</p>

                <div className="mt-8">
                    <UploadPageCard />
                </div>
            </div>
        </main>
    );
}