export default function Loading() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
        <p className="text-xl font-bold tracking-[0.35em] text-white">WHISTLE</p>
        <p className="text-sm text-gray-500 mt-2">Loading...</p>
      </div>
    </div>
  );
}

