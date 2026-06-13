import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const COLUMN_HEADS = ["Name", "Company", "Contact", "Location", "Status"];

/**
 * CustomerListSkeleton — mirrors the list (table) layout in
 * app/(app)/customers/page.tsx: circular avatar + name in the first cell,
 * four text columns after. Grid view falls back to this on initial load.
 */
export function CustomerListSkeleton({ rows = 6 }: { rows?: number }) {
  const rowIds = Array.from({ length: rows }, (_, i) => `row-${i}`);

  return (
    <Table className="border-separate border-spacing-x-0 border-spacing-y-1">
      <TableHeader className="[&_tr]:border-0 [&_th]:border-b">
        <TableRow className="hover:bg-transparent">
          {COLUMN_HEADS.map((head, i) => (
            <TableHead key={head} className={i === COLUMN_HEADS.length - 1 ? "text-right" : ""}>
              {head}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rowIds.map((id) => (
          <TableRow key={id} className="border-0 hover:bg-transparent">
            <TableCell className="py-1.5">
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
            </TableCell>
            <TableCell className="py-1.5">
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell className="py-1.5">
              <Skeleton className="h-4 w-40" />
            </TableCell>
            <TableCell className="py-1.5">
              <Skeleton className="h-4 w-20" />
            </TableCell>
            <TableCell className="py-1.5 text-right">
              <Skeleton className="ml-auto h-4 w-16" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * CustomerDetailSkeleton — mirrors app/(app)/customers/[id]/page.tsx:
 * a logo card on top, then the four stacked form cards
 * (Contact, Address, Billing, Notes).
 */
export function CustomerDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Logo card */}
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-3 w-72" />
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-5">
            <Skeleton className="size-20 shrink-0 rounded-md" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-field card (Contact) */}
      <FormCardSkeleton fields={4} />
      {/* Address card */}
      <FormCardSkeleton fields={3} />
      {/* Billing card */}
      <FormCardSkeleton fields={2} />
      {/* Notes card */}
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-3 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function FormCardSkeleton({ fields }: { fields: number }) {
  const ids = Array.from({ length: fields }, (_, i) => `f-${i}`);
  return (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3 w-64" />
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ids.map((id) => (
          <div key={id} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
