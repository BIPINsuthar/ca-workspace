import { TableSkeleton } from "@/components/skeleton";

export default function Loading() {
  return <TableSkeleton {...{ filters: 0, rows: 5 }} />;
}
