export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4">
      <div className="max-w-md text-center space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-8">
        <h1 className="text-2xl font-bold">You are offline</h1>
        <p className="text-sm text-slate-300">
          Some features are unavailable without internet. You can still browse cached pages and return once online.
        </p>
      </div>
    </main>
  );
}
