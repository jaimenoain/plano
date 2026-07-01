import { Link, type MetaFunction } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/features/buildings/utils/structuredData";

const PAGE_TITLE = "Support the mission | Plano";
const PAGE_DESCRIPTION =
  "Plano ambassadors grow the world's most complete architecture database. Find your chapter, join the programme, and help build the map of architecture.";

export const meta: MetaFunction = () => [
  { title: PAGE_TITLE },
  { name: "description", content: PAGE_DESCRIPTION },
  { name: "robots", content: "index, follow" },
  { property: "og:title", content: PAGE_TITLE },
  { property: "og:description", content: PAGE_DESCRIPTION },
  { property: "og:type", content: "website" },
  { property: "og:url", content: `${SITE_URL}/support` },
];

// ─── Data ─────────────────────────────────────────────────────────────────────

const responsibilities = [
  {
    index: "01",
    heading: "Document",
    body: "Photograph buildings that lack imagery. Verify and enrich metadata — architects, dates, structural systems. Every edit raises the floor for everyone.",
  },
  {
    index: "02",
    heading: "Welcome",
    body: "Greet newcomers, flag duplicate entries, and keep the data honest. Ambassadors are the human review layer that automated pipelines can never replace.",
  },
  {
    index: "03",
    heading: "Organise",
    body: "Coordinate with your chapter's leadership on local priorities. Walk-tours, open calls, edit-a-thons — the programme is what its members make it.",
  },
  {
    index: "04",
    heading: "Connect",
    body: "Build relationships with architecture schools, practices, and cultural institutions in your area. Local knowledge opens doors that algorithms cannot reach.",
  },
];

const chapterTypes = [
  {
    type: "National",
    description:
      "One per country. Sets direction, maintains standards, and coordinates between cities. Ideal if your country has few local chapters or you prefer a broader remit.",
  },
  {
    type: "Local",
    description:
      "City or metropolitan-area chapters. Closer to the ground, higher cadence. Priority access to site visits and local events. Most ambassadors start here.",
  },
];

const values = [
  { stat: "40+", label: "Cities covered" },
  { stat: "200+", label: "Active ambassadors" },
  { stat: "12k+", label: "Buildings enriched" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SupportPage() {
  return (
    <div className="w-full">
      <AppLayout title="Support" showLogo={false}>
        <div className="w-full bg-surface-default">

          {/* ── Hero ──────────────────────────────────────────────────────── */}
          <section className="border-b border-border-default">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
              <p className="text-2xs font-medium tracking-[0.15em] uppercase text-text-secondary mb-8">
                Ambassador programme
              </p>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight text-text-primary">
                Build the map
                <br />
                of architecture
              </h1>
              <p className="mt-8 text-base sm:text-lg leading-relaxed text-text-secondary max-w-xl">
                Plano ambassadors are volunteers who grow and improve the world's most
                complete database of built architecture — city by city, building by building.
                The programme is open to anyone who cares about architecture where they live.
              </p>
              <div className="mt-10 flex items-center gap-6">
                <Button asChild variant="outline" size="lg" className="rounded-sm tracking-[0.15em] uppercase text-xs font-medium px-10">
                  <Link to="/become-ambassador">
                    Apply now
                  </Link>
                </Button>
                <Link
                  to="/become-ambassador"
                  className="text-xs font-medium tracking-[0.15em] uppercase text-text-secondary hover:text-text-primary transition-colors py-4 px-2"
                >
                  Learn more ↓
                </Link>
              </div>
            </div>
          </section>

          {/* ── Stats bar ─────────────────────────────────────────────────── */}
          <section className="border-b border-border-default">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-3 divide-x divide-border-default">
                {values.map(({ stat, label }) => (
                  <div key={label} className="py-10 px-4 first:pl-0 last:pr-0">
                    <p className="text-4xl font-bold tracking-tight leading-tight text-text-primary">
                      {stat}
                    </p>
                    <p className="mt-1 text-2xs font-medium tracking-[0.15em] uppercase text-text-secondary">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── What ambassadors do ───────────────────────────────────────── */}
          <section className="border-b border-border-default">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
              <p className="text-2xs font-medium tracking-[0.15em] uppercase text-text-secondary mb-2">
                The role
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-snug text-text-primary mb-16">
                A light, steady rhythm
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-14">
                {responsibilities.map(({ index, heading, body }) => (
                  <div key={index}>
                    <p className="text-2xs font-medium tracking-[0.15em] uppercase text-text-disabled mb-4">
                      {index}
                    </p>
                    <h3 className="text-xl font-semibold text-text-primary mb-3">
                      {heading}
                    </h3>
                    <p className="text-sm leading-relaxed text-text-secondary">
                      {body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Pull quote ────────────────────────────────────────────────── */}
          <section className="border-b border-border-default bg-surface-inverse">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
              <p
                className="text-3xl sm:text-4xl font-medium leading-snug text-text-inverse"
                style={{ letterSpacing: "-0.025em" }}
              >
                "Every building that exists in the world deserves to be documented.
                Ambassadors are the reason that is possible."
              </p>
              <p className="mt-8 text-2xs font-medium tracking-[0.15em] uppercase text-white/40">
                Plano team
              </p>
            </div>
          </section>

          {/* ── Chapter structure ─────────────────────────────────────────── */}
          <section className="border-b border-border-default">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
              <p className="text-2xs font-medium tracking-[0.15em] uppercase text-text-secondary mb-2">
                Structure
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-snug text-text-primary mb-14">
                Two chapter types,
                <br />
                one programme
              </h2>

              <div className="space-y-0 divide-y divide-border-default">
                {chapterTypes.map(({ type, description }) => (
                  <div key={type} className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-6 py-10">
                    <div>
                      <p className="text-xs font-medium tracking-[0.15em] uppercase text-text-primary">
                        {type}
                      </p>
                    </div>
                    <p className="text-sm leading-relaxed text-text-secondary">
                      {description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── What you get ──────────────────────────────────────────────── */}
          <section className="border-b border-border-default">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
              <p className="text-2xs font-medium tracking-[0.15em] uppercase text-text-secondary mb-2">
                Benefits
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-snug text-text-primary mb-14">
                What the programme
                <br />
                gives back
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-12 gap-y-10">
                {[
                  {
                    heading: "Early access",
                    body: "Ambassador members are first to test new platform features before public release.",
                  },
                  {
                    heading: "The Embassy",
                    body: "Exclusive ambassador workspace for chapter coordination, announcements, and shared resources.",
                  },
                  {
                    heading: "Community",
                    body: "A network of architecture practitioners, students, and enthusiasts working toward the same goal.",
                  },
                ].map(({ heading, body }) => (
                  <div key={heading}>
                    <div className="w-6 h-[1px] bg-text-primary mb-6" />
                    <h3 className="text-sm font-semibold text-text-primary mb-3 tracking-normal">
                      {heading}
                    </h3>
                    <p className="text-sm leading-relaxed text-text-secondary">
                      {body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Apply CTA ─────────────────────────────────────────────────── */}
          <section>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
              <p className="text-2xs font-medium tracking-[0.15em] uppercase text-text-secondary mb-6">
                Join the programme
              </p>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-text-primary mb-10">
                Your city is waiting
              </h2>
              <p className="text-base leading-relaxed text-text-secondary max-w-md mb-12">
                Applications take five minutes. Chapter leaders review submissions and
                respond within two weeks. No experience required — only care.
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <Button asChild variant="accent" size="lg" className="px-10">
                  <Link to="/become-ambassador">
                    Apply to a chapter
                  </Link>
                </Button>
                <Link
                  to="/embassy"
                  className="group inline-flex items-center gap-2 text-xs font-medium tracking-[0.15em] uppercase text-text-secondary hover:text-text-primary transition-colors"
                >
                  Already an ambassador?
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </div>
            </div>
          </section>

        </div>
      </AppLayout>
    </div>
  );
}
