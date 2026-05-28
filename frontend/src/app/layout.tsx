import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Noctis — Privacy-First Payroll on Stellar",
  description:
    "Private, streaming payroll with zero-knowledge proofs on Stellar testnet",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
