/** A wind direction arrow — points the way the wind blows TO (`dir` is
 *  "comes from", as reported by weather APIs). Shared between the forecast
 *  strip and the live conditions card. */
export default function WindArrow({
  dir,
  size = 22,
  className = "",
}: {
  dir: number;
  size?: number;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <g transform={`rotate(${(dir + 180) % 360} 12 12)`}>
        <line x1="12" y1="19" x2="12" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 4 L7.5 10 L16.5 10 Z" fill="currentColor" />
      </g>
    </svg>
  );
}
