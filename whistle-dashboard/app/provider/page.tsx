'use client';

import ProviderDashboardDark from '@/components/ProviderDashboardDark';
import Navigation from '@/components/Navigation';

export default function ProviderPage() {
  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      <main className="pt-16">
        <ProviderDashboardDark />
      </main>
    </div>
  );
}
