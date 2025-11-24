'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function ProviderPage() {
  useEffect(() => {
    // Redirect to main page
    window.location.href = '/';
  }, []);

  return null;
}
