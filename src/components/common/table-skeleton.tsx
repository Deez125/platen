import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
};

export function TableSkeleton({ rows = 6, columns = 4 }: TableSkeletonProps) {
  const rowIds = Array.from({ length: rows }, (_, i) => `r-${i}`);
  const colIds = Array.from({ length: columns }, (_, i) => `c-${i}`);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {colIds.map((c) => (
            <TableHead key={c}>
              <Skeleton className="h-4 w-24" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rowIds.map((r) => (
          <TableRow key={r}>
            {colIds.map((c) => (
              <TableCell key={`${r}-${c}`}>
                <Skeleton className="h-4 w-full max-w-[160px]" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
