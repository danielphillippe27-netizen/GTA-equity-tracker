import Link from 'next/link';
import { GlowButton } from '@/components/shared';

export default async function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;
  const message =
    params.message ||
    'There was a problem signing you in. The link may have expired or already been used. Please try again.';

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <svg
            className="h-8 w-8 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="mb-2 text-xl font-semibold text-foreground">Authentication Error</h1>
        <p className="mb-6 text-muted-foreground">{message}</p>
        <Link href="/">
          <GlowButton>Back to Home</GlowButton>
        </Link>
      </div>
    </main>
  );
}
