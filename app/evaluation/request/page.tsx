import Link from 'next/link';
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
  const region = readPropertyString(propertyData, 'region');
  const propertyType = readPropertyString(propertyData, 'propertyType');

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(77,163,255,0.18),_transparent_45%),linear-gradient(180deg,_rgba(11,15,20,0.95),_rgba(11,15,20,1))]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 rounded-[28px] border border-white/8 bg-white/4 px-6 py-5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-accent-cyan">
              Brought to you by:
            </p>
            <h1 className="text-2xl font-semibold text-white">
              The Phillippe Group
            </h1>
          </div>
          <Link
            href="mailto:info@phillippegroup.ca"
            className="inline-flex items-center justify-center rounded-full border border-white/12 px-5 py-3 text-sm font-medium text-white transition-colors hover:border-accent-blue/60 hover:bg-accent-blue/10"
          >
            Contact The Team Directly
          </Link>
        </div>

        <div className="grid flex-1 gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-accent-cyan">
              Email Follow-Up
            </p>
            <h2 className="max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Turn this monthly update into a precise home evaluation.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              The email CTA now routes here instead of a generic dashboard link.
              That gives you a dedicated landing page where the subscriber can
              confirm their details, create a tagged evaluation request, and
              trigger a direct follow-up from your team.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/8 bg-white/4 p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Region
                </p>
                <p className="text-lg font-semibold text-white">
                  {region || 'Loaded from subscriber record'}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/4 p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Property Type
                </p>
                <p className="text-lg font-semibold text-white">
                  {propertyType || 'Loaded from subscriber record'}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/4 p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Follow-Up
                </p>
                <p className="text-lg font-semibold text-white">
                  Direct outreach
                </p>
              </div>
            </div>
          </section>

          <section>
            <RequestPreciseEvaluationForm
              subscriberId={subscriber?.id || subscriberId}
              estimateId={estimateId}
              initialName={subscriber?.name}
              initialEmail={subscriber?.email}
              region={region}
              propertyType={propertyType}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
