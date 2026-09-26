import { PublicNav } from "@/components/shell/public-nav";
import { Skeleton } from "@/components/ui/primitives";

/** Streamed while the server fetches published fests; same shell, so nothing jumps when data lands. */
export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col" aria-busy>
      <PublicNav />
      <div className="mx-auto w-full max-w-[1180px] px-[18px] pb-14 pt-10 sm:px-6 sm:pt-16 lg:px-10">
        <Skeleton className="mb-[18px] h-6 w-64" />
        <Skeleton className="mb-5 h-16 w-full max-w-[500px]" />
        <Skeleton className="mb-[26px] h-10 w-full max-w-[500px]" />
        <div className="flex gap-2.5">
          <Skeleton className="h-11 w-40" />
          <Skeleton className="h-11 w-40" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1180px] px-[18px] pb-5 pt-[30px] sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    </div>
  );
}
