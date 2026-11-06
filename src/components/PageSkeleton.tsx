export default function PageSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="space-y-3">
          <div className="skeleton h-5 w-40 rounded-md" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton h-56 rounded-2xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
