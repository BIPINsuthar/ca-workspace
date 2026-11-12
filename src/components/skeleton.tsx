import { cx } from "./ui";

export function Bone({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-lg bg-panel-2", className)} />;
}

function Header() {
  return (
    <div className="mb-6 flex items-end justify-between gap-3">
      <div className="space-y-2">
        <Bone className="h-7 w-56" />
        <Bone className="h-4 w-80 max-w-[70vw]" />
      </div>
      <Bone className="h-9 w-28" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <>
      <Header />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => <Bone key={i} className="h-[118px] rounded-2xl" />)}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => <Bone key={i} className="h-80 rounded-2xl" />)}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Bone className="h-96 rounded-2xl lg:col-span-2" />
        <Bone className="h-96 rounded-2xl" />
      </div>
    </>
  );
}

export function TableSkeleton({ rows = 8, filters = 3 }: { rows?: number; filters?: number }) {
  return (
    <>
      <Header />
      <div className="mb-5 flex flex-wrap gap-2">
        <Bone className="h-10 w-full sm:w-64" />
        {Array.from({ length: filters }, (_, i) => <Bone key={i} className="h-10 w-36" />)}
      </div>
      <div className="card divide-y divide-line">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4">
            <Bone className="h-8 w-8 rounded-full" />
            <Bone className="h-4 flex-1" />
            <Bone className="hidden h-4 w-32 sm:block" />
            <Bone className="hidden h-4 w-24 md:block" />
          </div>
        ))}
      </div>
    </>
  );
}

export function BoardSkeleton() {
  return (
    <>
      <Header />
      <div className="mb-5 flex flex-wrap gap-2">
        <Bone className="h-10 w-full sm:w-64" />
        {Array.from({ length: 5 }, (_, i) => <Bone key={i} className="h-10 w-32" />)}
      </div>
      <div className="flex gap-4 overflow-hidden xl:grid xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, c) => (
          <div key={c} className="w-80 shrink-0 space-y-3 xl:w-auto">
            <Bone className="h-5 w-28" />
            {Array.from({ length: 3 - (c % 2) }, (_, i) => <Bone key={i} className="h-44 rounded-2xl" />)}
          </div>
        ))}
      </div>
    </>
  );
}

export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl">
      <Bone className="mb-4 h-4 w-20" />
      <Header />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Bone className="h-40 rounded-2xl" />
          <Bone className="h-72 rounded-2xl" />
        </div>
        <Bone className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
