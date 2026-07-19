import "../styles/home.css";

// Fixed, deterministic layout so glows don't jump around between renders/pages.
// Large, soft, diffuse color blobs, locked to the brand's blue/violet/pink
// family only (no red/yellow/green) — kept away from the very top/bottom
// edges so the blur fully fades out before it hits the section's clipped
// boundary, instead of getting sliced into a hard half-circle.
const PRESETS = [
  { top: "20%", left: "8%",  size: 420, color: "indigo", delay: "0s" },
  { top: "62%", left: "82%", size: 380, color: "pink",   delay: "1.4s" },
  { top: "78%", left: "22%", size: 400, color: "cyan",   delay: "2.6s" },
  { top: "28%", left: "68%", size: 440, color: "violet", delay: "0.8s" },
  { top: "50%", left: "40%", size: 360, color: "purple", delay: "1.8s" },
];

/**
 * Drops a handful of large, soft, breathing brand-colored glow blobs
 * across whichever positioned ancestor this is placed in. Use `density="sparse"`
 * for short bridge/transition strips between sections.
 */
function ColorSpots({ density = "normal", className = "" }) {
  const spots = density === "sparse" ? PRESETS.slice(0, 3) : PRESETS;

  return (
    <div className={`qw_spots ${className}`} aria-hidden="true">
      {spots.map((s, i) => (
        <span
          key={i}
          className={`qw_spot qw_spot_${s.color}`}
          style={{
            top: s.top,
            left: s.left,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: s.delay,
          }}
        />
      ))}
    </div>
  );
}

export default ColorSpots;