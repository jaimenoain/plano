import { type MetaFunction, useNavigate } from "react-router";
import { useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PeopleYouMayKnow } from "@/features/connect/components/PeopleYouMayKnow";
import { YourContacts } from "@/features/connect/components/YourContacts";
import { useAuth } from "@/features/auth/hooks/useAuth";

export const meta: MetaFunction = () => [
  { title: "Connect | Plano" },
  { name: "robots", content: "noindex, nofollow" },
];

export default function Connect() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return null;
  }

  return (
    <div className="w-full">
      <AppLayout title="Connect" showLogo={false}>
        <div className="w-full pb-24">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8">

            {/* ── Editorial page heading ── */}
            <div className="pt-10 pb-10 border-b border-border-default">
              <h1 className="headline">Connect</h1>
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