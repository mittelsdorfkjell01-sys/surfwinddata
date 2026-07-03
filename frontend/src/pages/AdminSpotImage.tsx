import { Link } from "react-router-dom";
import ImageUpload from "../components/ImageUpload";

/**
 * Admin: hero image for a spot. Placeholder screen that hosts the validated
 * upload field — the write endpoint is wired later (Sprint 8 admin path).
 */
export default function AdminSpotImage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[900px] items-center justify-between px-4 py-4 sm:px-8">
          <Link to="/" className="text-xl font-bold tracking-tight text-navy">
            SpotInfo
          </Link>
          <span className="text-[13px] font-medium text-muted">Admin · Spot-Bild</span>
        </div>
      </header>

      <main className="mx-auto max-w-[900px] px-4 py-10 sm:px-8">
        <h1 className="text-[24px] font-semibold text-navy">Header-Bild hinzufügen</h1>
        <p className="mt-2 text-[15px] text-muted">
          Lade das Titelbild für den Spot hoch. Es füllt den Header über die volle Breite —
          deshalb die hohen Anforderungen an die Auflösung.
        </p>

        <div className="mt-8">
          <ImageUpload />
        </div>
      </main>
    </div>
  );
}
