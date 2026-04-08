import { Link, useLoaderData, useParams, type MetaFunction } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  companyClaimDisputeLoader,
  type CompanyClaimDisputeLoaderData,
} from "./CompanyClaimDispute.loader";

export { companyClaimDisputeLoader as loader } from "./CompanyClaimDispute.loader";

export const meta: MetaFunction<typeof companyClaimDisputeLoader> = ({ data }) => {
  if (!data) return [{ title: "Plano" }];
  const d = data as CompanyClaimDisputeLoaderData;
  return [{ title: `Dispute claim · ${d.companyName} | Plano` }];
};

export default function CompanyClaimDispute() {
  const { companyName } = useLoaderData() as CompanyClaimDisputeLoaderData;
  const { slug } = useParams();

  return (
    <AppLayout showBack>
      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <h1 className="mb-3 text-2xl font-bold tracking-tight text-text-primary">Dispute this company claim</h1>
        <p className="mb-4 text-sm leading-relaxed text-text-secondary">
          The work email you entered doesn&apos;t match the domain already verified for{" "}
          <span className="font-medium text-text-primary">{companyName}</span>. A full dispute form (reason and
          optional evidence) will be added in a later update. If you need help sooner, contact support.
        </p>
        <Button asChild variant="default" className="mt-2">
          <Link to={slug ? `/company/${slug}` : "/"}>Back to company</Link>
        </Button>
      </div>
    </AppLayout>
  );
}
