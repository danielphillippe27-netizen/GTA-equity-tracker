import { RequestPreciseEvaluationForm } from './RequestPreciseEvaluationForm';
import { createServerClient } from '@/lib/supabase/server';

interface SearchParams {
  subscriberId?: string | string[];
  estimateId?: string | string[];
}

function getSingleParam(value?: string | string[]): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function readPropertyString(
  propertyData: Record<string, unknown> | null,
  key: string
): string | null {
  const value = propertyData?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export default async function EvaluationRequestPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const subscriberId = getSingleParam(params.subscriberId);
  const requestedEstimateId = getSingleParam(params.estimateId);

  let subscriber:
    | {
        id: string;
        name: string | null;
        email: string;
        estimate_id: string | null;
        property_data: Record<string, unknown> | null;
      }
    | null = null;

  if (subscriberId) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('subscribers')
      .select('id, name, email, estimate_id, property_data')
      .eq('id', subscriberId)
      .maybeSingle();

    subscriber = data;
  }

  const propertyData =
    (subscriber?.property_data as Record<string, unknown> | null) ?? null;
  const estimateId =
    requestedEstimateId ||
    subscriber?.estimate_id ||
    readPropertyString(propertyData, 'estimateId');
  const address =
    readPropertyString(propertyData, 'address') ||
    readPropertyString(propertyData, 'full_address');
  const region = readPropertyString(propertyData, 'region');
  const propertyType = readPropertyString(propertyData, 'propertyType');

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(77,163,255,0.18),_transparent_45%),linear-gradient(180deg,_rgba(11,15,20,0.95),_rgba(11,15,20,1))]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-10 sm:px-6 lg:px-8">
        <div className="relative mb-10 flex flex-col gap-4 rounded-[28px] border border-white/8 bg-white/4 px-6 py-5 backdrop-blur-sm sm:min-h-[132px] sm:justify-center">
          <div className="flex flex-col sm:items-start">
            <p className="mb-2 text-left text-xs font-semibold uppercase tracking-[0.24em] text-accent-cyan">
              Brought to you by:
            </p>
            <h1 className="text-center text-2xl font-semibold text-white sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2">
              The Phillippe Group
            </h1>
          </div>
          <a
            href="/daniel-phillippe.vcf"
            className="inline-flex items-center justify-center rounded-full border border-white/12 px-5 py-3 text-sm font-medium text-white transition-colors hover:border-accent-blue/60 hover:bg-accent-blue/10 sm:absolute sm:right-6 sm:top-1/2 sm:-translate-y-1/2"
          >
            Contact The Team Directly
          </a>
        </div>

        <div className="grid flex-1 gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section>
            <h2 className="max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Ready for a precise home evaluation?
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Your monthly update uses benchmark pricing to track general market
              movement in your area.
              <br />
              <br />
              If you&apos;d like a more exact number based on your property&apos;s
              condition, upgrades, lot size, layout, and recent comparable
              sales, we can prepare a precise evaluation tailored specifically
              to your home.
              <br />
              <br />
              This includes a review of active competition, buyer demand, and
              recent sales activity in your neighbourhood, not just broad
              regional averages.
              <br />
              <br />
              Whether you&apos;re considering selling, refinancing, or simply want
              clarity on your position, a precise valuation gives you a clearer
              picture of your real options.
            </p>
          </section>

          <section>
            <RequestPreciseEvaluationForm
              subscriberId={subscriber?.id || subscriberId}
              estimateId={estimateId}
              initialName={subscriber?.name}
              initialEmail={subscriber?.email}
              initialAddress={address}
              region={region}
              propertyType={propertyType}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
