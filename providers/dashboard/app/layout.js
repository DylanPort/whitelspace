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
      <head>
        {/* Google Ads Tag */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=AW-17782201837"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'AW-17782201837');
            `,
          }}
        />
      </head>
      <body className="bg-whistle-darker min-h-screen" suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}

