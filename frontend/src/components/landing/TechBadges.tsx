const technologies = [
  'Stellar', 'Noir', 'UltraHonk', 'Poseidon2', 'BN254', 'Soroban',
  'WASM', 'Freighter', 'USDC',
]

export function TechBadges() {
  return (
    <section className="text-center space-y-6">
      <p className="text-sm text-white/40 uppercase tracking-widest">Powered By</p>
      <div className="flex flex-wrap justify-center gap-3">
        {technologies.map((tech) => (
          <span
            key={tech}
            className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm font-mono text-white/60"
          >
            {tech}
          </span>
        ))}
      </div>
    </section>
  )
}
