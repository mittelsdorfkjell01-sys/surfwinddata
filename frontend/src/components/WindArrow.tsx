import { motion } from "framer-motion";

/** A wind direction arrow — points the way the wind blows TO (`dir` is
 *  "comes from", as reported by weather APIs). Shared between the forecast
 *  strip and the live conditions displays. */
export default function WindArrow({
  dir,
  size = 22,
  className = "",
  animate = false,
}: {
  dir: number;
  size?: number;
  className?: string;
  /** Swing smoothly into `dir` instead of snapping — opt-in (the spot map's
   *  live overlay); everywhere else keeps the plain static rotate. */
  animate?: boolean;
}) {
  const rotation = (dir + 180) % 360;
  const shape = (
    <>
      <line x1="12" y1="19" x2="12" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 4 L7.5 10 L16.5 10 Z" fill="currentColor" />
    </>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {animate ? (
        <motion.g
          style={{ transformOrigin: "12px 12px" }}
          initial={{ rotate: 0 }}
          animate={{ rotate: rotation }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {shape}
        </motion.g>
      ) : (
        <g transform={`rotate(${rotation} 12 12)`}>{shape}</g>
      )}
    </svg>
  );
}
