import './globals.css'

export const metadata = {
  title: 'WHISTLE | The Decentralization Movement',
  description: 'Decentralized RPC, VPN, OS, Hardware - A rebellion against centralization. Built on Solana.',
  icons: {
    icon: '/whistle-logo.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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
      <body>{children}</body>
    </html>
  )
}

