import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'WHISTLE Provider Dashboard',
  description: 'Real-time metrics and management for Whistlenet providers',
  icons: {
    icon: '/whistle-logo.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-whistle-darker min-h-screen" suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}

