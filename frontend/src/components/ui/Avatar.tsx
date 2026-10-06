import Image from "next/image";

interface AvatarProps {
  initials: string;
  imageUrl?: string | null;
  className?: string; // size and text size, e.g. "size-7 text-xs"
}

// Round user picture. Without a picture it shows the user's initials.
export function Avatar({ initials, imageUrl, className = "size-7 text-xs" }: AvatarProps) {
  return (
    <span
      className={`relative flex flex-none items-center justify-center overflow-hidden rounded-full bg-mt-accent-soft font-semibold text-mt-accent-text ${className}`}
    >
      {imageUrl ? (
        // "fill" stretches the picture over the circle. "unoptimized" loads it straight
        // from its own address, so pictures from any website work without extra config.
        <Image src={imageUrl} alt="" fill unoptimized className="object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}
