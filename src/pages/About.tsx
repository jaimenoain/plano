import { ScrollRestoration, type MetaFunction } from "react-router";
import { SITE_URL } from "@/features/buildings/utils/structuredData";

const ABOUT_TITLE = "About | Plano";
const ABOUT_DESCRIPTION =
  "Plano is the definitive platform for discovering, documenting, and sharing the world's architecture.";
const ABOUT_CANONICAL = `${SITE_URL}/about`;
const ABOUT_OG_IMAGE = `${SITE_URL}/cover.jpg`;

export const meta: MetaFunction = () => [
  { title: ABOUT_TITLE },
  { name: "description", content: ABOUT_DESCRIPTION },
  { property: "og:title", content: ABOUT_TITLE },
  { property: "og:description", content: ABOUT_DESCRIPTION },
  { property: "og:image", content: ABOUT_OG_IMAGE },
  { property: "og:type", content: "website" },
  { property: "og:url", content: ABOUT_CANONICAL },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: ABOUT_TITLE },
  { name: "twitter:description", content: ABOUT_DESCRIPTION },
  { name: "twitter:image", content: ABOUT_OG_IMAGE },
  { tagName: "link", rel: "canonical", href: ABOUT_CANONICAL },
];

export default function About() {
  return (
    <div className="min-h-screen bg-surface-default text-text-primary">
      <ScrollRestoration />
      <div className="container mx-auto py-16 px-4 max-w-3xl space-y-16">

        <header className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-widest text-text-secondary">
            About
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            The world's architecture, cataloged.
          </h1>
          <p className="text-lg text-text-secondary leading-relaxed">
            Plano is the definitive platform for discovering, documenting, and
            sharing the world's architecture — built by people who believe great
            buildings deserve to be remembered.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">What we're building</h2>
          <p className="text-text-secondary leading-relaxed">
            Architecture shapes every city, neighbourhood, and street we live in.
            Yet most of it goes unrecorded, undiscovered, and unappreciated outside
            a small professional circle. Plano changes that.
          </p>
          <p className="text-text-secondary leading-relaxed">
            We're building the most comprehensive, community-maintained database of
            notable architecture worldwide — with rich metadata covering styles,
            materials, construction history, and access information. On top of that
            catalogue, we're building a social layer that lets you track every
            building you visit, rate what you see, discover new architecture through
            maps and feeds, and connect with a global community that shares your
            passion.
          </p>
        </section>

        <section className="space-y-6">
          <h2 className="text-xl font-semibold tracking-tight">Who Plano is for</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              {
                title: "The Enthusiast",
                description:
                  "Travels to see notable buildings, keeps a personal log of visits, and rates what they see. Plano is Letterboxd for architecture.",
              },
              {
                title: "The Student & Researcher",
                description:
                  "Needs a rich, browsable catalogue with taxonomy, styles, and materials data. Values completeness and accuracy.",
              },
              {
                title: "The Practising Architect",
                description:
                  "Claims their professional profile, manages their portfolio, and posts official statements on their own buildings.",
              },
              {
                title: "The Curator",
                description:
                  'Organises themed collections — "Brutalist Gems of London" — builds multi-day itineraries, and shares them publicly.',
              },
            ].map(({ title, description }) => (
              <div key={title} className="space-y-2 border-t border-border-default pt-4">
                <h3 className="font-semibold text-sm uppercase tracking-widest">
                  {title}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Core features</h2>
          <ul className="space-y-3 text-text-secondary">
            {[
              [
                "Catalogue",
                "A comprehensive, community-maintained database of notable architecture worldwide with rich metadata.",
              ],
              [
                "Personal library",
                "Track every building you've visited or want to visit, with ratings on a three-point Masterpiece scale.",
              ],
              [
                "Discovery map",
                "An interactive global map with server-side clustering, deep filtering, and popularity-tiered pins.",
              ],
              [
                "Social",
                "Follow friends and architects, share recommendations, and see what the people you trust are visiting.",
              ],
              [
                "Collections & itineraries",
                "Curate themed building lists and generate AI-powered multi-day itineraries with optimised routes.",
              ],
              [
                "Architect identity",
                "Verified professional profiles with portfolio pages and official building statements.",
              ],
            ].map(([label, text]) => (
              <li key={label} className="flex gap-3">
                <span className="font-semibold text-text-primary shrink-0 w-40">
                  {label}
                </span>
                <span className="leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Get in touch</h2>
          <p className="text-text-secondary leading-relaxed">
            We're a small team with a large ambition. If you have questions,
            feedback, or just want to talk about architecture, reach us at{" "}
            <a
              href="mailto:hello@plano.app"
              className="text-text-primary font-medium hover:underline underline-offset-2"
            >
              hello@plano.app
            </a>
            .
          </p>
        </section>

      </div>
    </div>
  );
}
