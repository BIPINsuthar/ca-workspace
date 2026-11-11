import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-5xl font-semibold text-faint">404</p>
      <p className="text-lg font-medium">This page doesn't exist or you don't have access.</p>
      <Link href="/" className="btn-primary mt-2">Back to dashboard</Link>
    </main>
  );
}
