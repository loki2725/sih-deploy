// A complete, rounded brain silhouette - drawn as a simple, mathematically
// symmetric shape (mirrored left/right around x=12) rather than the more
// abstract multi-loop shape lucide-react's <Brain> icon uses, which reads
// as a partial/half brain from a distance. Kept as a stroke-only outline
// (no fill) so it matches the rest of the app's lucide-style icons.
//
// Drop-in API matches lucide icons: <BrainLogo size={16} color="#fff" />
export function BrainLogo({ size = 24, color = "currentColor", ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="NeuroNest"
      {...props}
    >
      {/* Outer silhouette - one continuous, mirror-symmetric outline */}
      <path d="M12 3 C16 3 20 7 20 11 C20 15 16 19 12 20 C8 19 4 15 4 11 C4 7 8 3 12 3 Z" />

      {/* Center hemisphere divider */}
      <path d="M12 4 V19" />

      {/* Gyri texture, mirrored on both sides */}
      <path d="M15 8 Q17 9 15 11" />
      <path d="M9 8 Q7 9 9 11" />
      <path d="M16 13 Q18 14 16 16" />
      <path d="M8 13 Q6 14 8 16" />
    </svg>
  );
}
