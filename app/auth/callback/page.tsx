import { AuthCallbackClient } from './AuthCallbackClient';

type AccountIntent = 'homeowner' | 'agent' | 'owner';

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string;
    next?: string;
    intent?: string;
    error?: string;
    error_description?: string;
  }>;
}) {
  const params = await searchParams;
  const intent: AccountIntent | null =
    params.intent === 'homeowner' ||
    params.intent === 'agent' ||
    params.intent === 'owner'
      ? params.intent
      : null;

  return (
    <AuthCallbackClient
      next={params.next ?? '/dashboard'}
      intent={intent}
      errorMessage={params.error_description ?? params.error ?? null}
    />
  );
}
