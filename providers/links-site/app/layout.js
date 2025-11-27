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
      <body>{children}</body>
    </html>
  )
}

