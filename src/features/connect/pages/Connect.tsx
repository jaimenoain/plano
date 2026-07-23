import { type MetaFunction, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PeopleYouMayKnow } from "../components/PeopleYouMayKnow";
import { YourContacts } from "../components/YourContacts";
import { ConnectPeopleSearch, isSearchActive } from "../components/ConnectPeopleSearch";
import { useAuth } from "@/features/auth/hooks/useAuth";

export const meta: MetaFunction = () => [
  { title: "Connect | Plano" },
  { name: "robots", content: "noindex, nofollow" },
];

export default function Connect() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return null;
  }

  const searching = isSearchActive(query);

  return (
    <div className="w-full">
      <AppLayout title="Connect" showLogo={false}>
        <div className="w-full pb-24">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8">

            {/* ── Editorial hero ── */}
            <div className="pt-10 pb-8 border-b border-border-default">
              <p className="eyebrow tracking-widest mb-3">Community</p>
              <h1 className="headline">Connect</h1>
              <p className="body-relaxed mt-4 max-w-xl text-text-secondary">
                Find people, follow the ones whose taste you trust, and keep up with who
                you already know.
              </p>
            </div>

            {/* ── Search — the discovery entry point ── */}
            <section className="py-8 border-b border-border-default">
              <ConnectPeopleSearch query={query} onQueryChange={setQuery} />
            </section>

            {/* ── Discovery grid — hidden while a search owns the page ── */}
            {!searching && (
              <div className="grid grid-cols-1 gap-x-12 gap-y-12 py-12 lg:grid-cols-12">
                {/* Main: suggestions */}
                <section className="lg:col-span-7">
                  <PeopleYouMayKnow limit={8} />
                </section>

                {/* Rail: existing contacts */}
                <section className="lg:col-span-5">
                  <YourContacts />
                </section>
              </div>
            )}

          </div>
        </div>
      </AppLayout>
    </div>
  );
}
