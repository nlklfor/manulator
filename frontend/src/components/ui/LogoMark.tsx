// LogoMark — the manulator logo ("Rubric initial" from the design): a red rounded square
// with a lowercase "m" whose feet are pen-cut diamonds, like the red initial of a manuscript.
// Decorative: the name "manulator" is always written next to it, so screen readers skip it.
export function LogoMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={`flex-none ${className}`}>
      <rect width="100" height="100" rx="22" fill="#9A2B1C" />
      <rect
        x="8.5"
        y="8.5"
        width="83"
        height="83"
        rx="15"
        fill="none"
        stroke="#F6EEDC"
        strokeOpacity={0.45}
        strokeWidth={1.4}
      />
      <g fill="#F6EEDC" transform="translate(-3.5 -5.5)">
        <path d="M23 41 L31 35 L35 35 L35 68 L27 68 L27 44 Z" />
        <path d="M33 46 C37 38 43 35 48 35 C55 35 59 40 59 47 L59 68 L51 68 L51 48 C51 44 49 42 46 42 C42 42 38 45 35 50 Z" />
        <path d="M57 46 C61 38 66 35 71 35 C78 35 81 40 81 47 L81 68 L73 68 L73 48 C73 44 71 42 68 42 C64 42 61 45 59 50 Z" />
        <path d="M31 64 L37 70 L31 76 L25 70 Z" />
        <path d="M55 64 L61 70 L55 76 L49 70 Z" />
        <path d="M77 64 L83 70 L77 76 L71 70 Z" />
      </g>
    </svg>
  );
}
