'use client';

import Link from 'next/link';
import { GlowButton } from '@/components/shared';

export default function AuthCodeErrorPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
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
        <h1 className="text-xl font-semibold text-foreground mb-2">
          Authentication Error
        </h1>
        <p className="text-muted-foreground mb-6">
          There was a problem signing you in. The link may have expired or already been used. 
          Please try again.
        </p>
        <Link href="/">
          <GlowButton>Back to Home</GlowButton>
        </Link>
      </div>
    </main>
  );
}
