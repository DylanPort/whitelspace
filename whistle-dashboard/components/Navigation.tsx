'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'HOME' },
    { href: '/dashboard', label: 'DASHBOARD' },
    { href: '/tokens', label: 'TOKENS' },
    { href: '/transactions', label: 'TRANSACTIONS' },
    { href: '/provider', label: 'PROVIDER' },
    { href: '/network', label: 'NETWORK' },
    { href: '/docs', label: 'DOCS' },
  ];

  // Only show navigation if not on home page or provider page (provider has its own header)
  if (pathname === '/' || pathname === '/provider') return null;

  return (
    <nav className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-3">
            <div className="text-2xl font-bold tracking-[0.3em]">WHISTLE</div>
          </Link>

          {/* Nav Items */}
          <div className="flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-xs tracking-[0.15em] transition-colors ${
                  pathname === item.href
                    ? 'text-white border-b-2 border-white pb-1'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Wallet Button */}
          <WalletMultiButton />
        </div>
      </div>
    </nav>
  );
}

