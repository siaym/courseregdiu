export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex">
      <div className="hidden lg:block w-60 shrink-0 border-r border-[#1c263c] bg-[#0f1623]" />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 border-b border-[#1c263c] bg-[#0f1623]/60" />
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto space-y-6 animate-pulse">
          <div className="space-y-2">
            <div className="h-7 w-64 rounded-lg bg-[#172136]" />
            <div className="h-4 w-96 max-w-full rounded bg-[#121a2b]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl border border-[#1c263c] bg-[#121827]"
              />
            ))}
          </div>
          <div className="h-96 rounded-xl border border-[#1c263c] bg-[#121827]" />
        </main>
      </div>
    </div>
  );
}
