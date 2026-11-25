"use client";

// Friendly fallback instead of the platform's generic error screen.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-lg font-semibold">Something went wrong loading this page.</p>
      <p className="max-w-md text-sm text-muted">
        This is usually a temporary database connection problem. If it keeps happening, check that your Supabase project isn&apos;t paused.
      </p>
      <div className="mt-2 flex gap-2">
        <button onClick={reset} className="btn-primary">Try again</button>
        <a href="/" className="btn-ghost">Go to dashboard</a>
      </div>
      {error.digest && <p className="mt-4 font-mono text-xs text-faint">Error {error.digest}</p>}
    </main>
  );
}
