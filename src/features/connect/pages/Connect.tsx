import { type MetaFunction } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { SITE_URL } from "@/features/buildings/utils/structuredData";
import { PeopleYouMayKnow } from "@/features/connect/components/PeopleYouMayKnow";
import { YourContacts } from "@/features/connect/components/YourContacts";

const CONNECT_TITLE = "Connect | Plano";
const CONNECT_DESCRIPTION =
  "Discover people to follow and keep track of your contacts on Plano.";
const CONNECT_CANONICAL = `${SITE_URL}/connect`;
const CONNECT_OG_IMAGE = `${SITE_URL}/cover.jpg`;

export const meta: MetaFunction = () => [
  { title: CONNECT_TITLE },
  { name: "description", content: CONNECT_DESCRIPTION },
  { property: "og:title", content: CONNECT_TITLE },
  { property: "og:description", content: CONNECT_DESCRIPTION },
  { property: "og:image", content: CONNECT_OG_IMAGE },
  { property: "og:type", content: "website" },
  { property: "og:url", content: CONNECT_CANONICAL },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: CONNECT_TITLE },
  { name: "twitter:description", content: CONNECT_DESCRIPTION },
  { name: "twitter:image", content: CONNECT_OG_IMAGE },
  { tagName: "link", rel: "canonical", href: CONNECT_CANONICAL },
];

export default function Connect() {
  return (
    <div className="w-full">
      <AppLayout title="Connect" showLogo={false}>
        <div className="w-full pb-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* ── Editorial page heading ── */}
            <div className="pt-10 pb-10 border-b border-border-default">
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-text-primary leading-none">
                Connect
              </h1>
            </div>

            {/* ── Suggestions ── */}
            <section className="py-12 border-b border-border-default">
              <PeopleYouMayKnow />
            </section>

            {/* ── Contacts ── */}
            <section className="py-12">
              <YourContacts />
            </section>

          </div>
        </div>
      </AppLayout>
    </div>
  );
}