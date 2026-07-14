import LandingHeader from "../components/LandingHeader";
import Footer from "../components/Footer";

/**
 * Impressum — legally required in DE (§ 5 DDG). Ships as a clearly marked
 * placeholder: the operator MUST replace the bracketed fields with real data
 * before going live. Deliberately contains no invented identity details.
 */
export default function Impressum() {
  return (
    <div className="relative min-h-screen bg-white">
      <LandingHeader />
      <main className="mx-auto max-w-[760px] px-4 pb-24 pt-32 sm:px-8">
        <h1 className="text-[28px] font-semibold text-navy">Impressum</h1>
        <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-navy/80">
          <p className="rounded-2xl border border-brand-orange/30 bg-brand-orange/5 p-4 text-[14px] text-navy/70">
            Platzhalter — hier müssen vor dem Live-Gang die gesetzlich
            vorgeschriebenen Angaben nach § 5 DDG (ehemals TMG) eingetragen
            werden. Bitte die eckigen Klammern durch die echten Betreiberdaten
            ersetzen.
          </p>

          <h2 className="text-[16px] font-semibold text-navy">Angaben gemäß § 5 DDG</h2>
          <p>
            [Name / Firma]
            <br />
            [Straße und Hausnummer]
            <br />
            [PLZ und Ort]
            <br />
            [Land]
          </p>

          <h2 className="text-[16px] font-semibold text-navy">Kontakt</h2>
          <p>
            Telefon: [Telefonnummer]
            <br />
            E-Mail: [E-Mail-Adresse]
          </p>

          <h2 className="text-[16px] font-semibold text-navy">
            Verantwortlich für den Inhalt
          </h2>
          <p>[Name und Anschrift der verantwortlichen Person]</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
