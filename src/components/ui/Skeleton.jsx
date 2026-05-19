export function ArticleSkeleton() {
  return (
    <div className="news-card overflow-hidden">
      <div className="h-44 animate-pulse bg-gray-200" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div className="h-5 w-full animate-pulse rounded bg-gray-200" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
  );
}
