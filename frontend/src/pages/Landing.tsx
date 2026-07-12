import LandingHeader from "../components/LandingHeader";
import HeroImage from "../components/HeroImage";
import SearchBar from "../components/SearchBar";
import TopSpotsRow from "../components/TopSpotsRow";

/**
 * "surfwind data" landing (Frame_1/5): one full-bleed hero photo carrying the
 * header, the Airbnb search bar (upper-middle) and the "aktuelle Top Spots" grid
 * near the bottom. The photo is a -z-10 layer behind everything — including the
 * top-spots tiles — so no white band shows. Content stays in the root stacking
 * context (no wrapping z-layer) so the search bar's z-[1200] wrapper still sits
 * above its body-portalled scrim (z-1100) and stays clickable.
 */
export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Full-bleed static hero (Frame_1/5 photo), behind all content. */}
      <div className="absolute inset-0 -z-10">
        <HeroImage
          src="/hero-surfwind.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-[rgba(30,110,126,0.35)]" />
      </div>

      <LandingHeader />

      <div className="flex min-h-screen flex-col">
        {/* Search — upper middle. z-[1200] keeps the bar above its scrim. */}
        <div className="flex flex-1 items-center justify-center px-4 pt-24 sm:px-6">
          <div className="relative z-[1200] w-full max-w-[960px]">
            <SearchBar />
          </div>
        </div>

        {/* aktuelle Top Spots — over the photo near the bottom, aligned to the
            header's content box, tiles spread across the full width (grid). */}
        <div className="mx-auto w-full max-w-[1500px] pb-6">
          <h2 className="mb-3 px-4 text-[18px] font-semibold text-white drop-shadow sm:px-10">
            aktuelle Top Spots
          </h2>
          <TopSpotsRow />
        </div>
      </div>
    </div>
  );
}
