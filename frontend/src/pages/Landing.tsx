import LandingHeader from "../components/LandingHeader";
import HeroImage from "../components/HeroImage";
import SearchBar from "../components/SearchBar";
import TopSpotsRow from "../components/TopSpotsRow";

/**
 * "surfwind data" landing (Frame_1/5): one full-bleed hero carrying the header,
 * the Airbnb search bar (upper-middle) and the "aktuelle Top Spots" row whose
 * glass tiles bleed off the bottom edge.
 */
export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Full-bleed static hero (Frame_1/5 photo). */}
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
        {/* Search — upper middle */}
        <div className="flex flex-1 items-center justify-center px-4 pt-24 sm:px-6">
          <div className="relative z-[1200] w-full max-w-[960px]">
            <SearchBar />
          </div>
        </div>

        {/* aktuelle Top Spots — pinned near the bottom, tiles bleed off */}
        <div className="pb-5">
          <h2 className="mb-3 px-4 text-[18px] font-semibold text-white drop-shadow sm:px-10">
            aktuelle Top Spots
          </h2>
          <TopSpotsRow />
        </div>
      </div>
    </div>
  );
}
