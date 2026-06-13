import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type CardGridSkeletonProps = {
  count?: number;
  className?: string;
};

export function CardGridSkeleton({ count = 6, className }: CardGridSkeletonProps) {
  const ids = Array.from({ length: count }, (_, i) => `c-${i}`);
  return (
    <div className={className ?? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>
      {ids.map((id) => (
        <Card key={id}>
          <CardHeader className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
