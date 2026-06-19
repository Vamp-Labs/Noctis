import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { template: '%s | ZK-SDP', default: 'ZK-SDP — Confidential Payroll on Stellar' },
  description: 'Privacy-preserving institutional payroll using zero-knowledge proofs on Stellar Soroban. Powered by Noir UltraHonk.',
  keywords: ['Stellar', 'zero-knowledge', 'ZK', 'payroll', 'Noir', 'UltraHonk', 'Soroban', 'privacy'],
  authors: [{ name: 'ArbaLabs' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'ZK-SDP',
    title: 'ZK-SDP — Confidential Payroll on Stellar',
    description: 'Salary amounts hidden by cryptographic proof. Verified on-chain. Compliant.',
    images: [{ url: '/og-zksdp.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ZK-SDP — Confidential Payroll on Stellar',
    description: 'Zero-knowledge payroll: Noir + UltraHonk + Soroban.',
    images: ['/og-zksdp.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-white/5">
          <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <a href="/" className="text-xl font-bold text-gradient">
              ZK-SDP
            </a>
            <div className="flex items-center gap-4 text-sm text-white/60">
              <a href="/employer/connect" className="hover:text-white transition">Employer</a>
              <a href="/auditor" className="hover:text-white transition">Auditor</a>
            </div>
          </nav>
        </header>
        <main className="flex-1">
          {children}
        </main>
        <footer className="border-t border-white/5 py-6 text-center text-sm text-white/40">
          Built for Stellar Hacks: Real-World ZK — DoraHacks 2026
        </footer>
      </body>
    </html>
  )
}
