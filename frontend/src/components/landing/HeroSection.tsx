export function HeroSection() {
  return (
    <section className="text-center pt-16 pb-8 space-y-8">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm">
        Built on Stellar Protocol 26 (Yardstick)
      </div>

      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
        <span className="text-gradient">Payroll.</span>
        <br />
        <span>Private by proof.</span>
      </h1>

      <p className="text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
        Zero-knowledge payroll for enterprises. Salary amounts hidden by cryptographic proof.
        Verified on-chain. Fully compliant.
      </p>

      <div className="flex items-center justify-center gap-4 pt-4">
        <a
          href="/employer/connect"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-primary text-white font-semibold glow-purple hover:bg-primary-hover transition-all"
        >
          I'm an Employer
          <span className="text-lg">→</span>
        </a>
        <a
          href="/withdraw"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-white/20 text-white font-semibold hover:bg-white/5 transition-all"
        >
          Claim My Salary
        </a>
      </div>

      <p className="text-sm text-white/30 pt-4">
        No server stores your salary data. No on-chain amount visibility. 
      </p>
    </section>
  )
}
