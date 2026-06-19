const steps = [
  {
    number: '01',
    title: 'Upload CSV',
    description: 'Employer uploads payroll CSV with wallet addresses and salary amounts.',
    icon: '📋',
  },
  {
    number: '02',
    title: 'Commit & Deposit',
    description: 'System builds a Merkle tree of commitments. Employer deposits total payroll into the Soroban contract.',
    icon: '🔒',
  },
  {
    number: '03',
    title: 'Share Claim Links',
    description: 'Each employee receives a unique withdrawal link with their secret payload.',
    icon: '🔗',
  },
  {
    number: '04',
    title: 'Employee Claims',
    description: 'Employee generates a ZK proof in-browser, submits it, and salary is paid — privately.',
    icon: '✅',
  },
]

export function HowItWorksSteps() {
  return (
    <section className="space-y-8">
      <h2 className="text-3xl font-bold text-center">How It Works</h2>
      <div className="grid md:grid-cols-4 gap-6">
        {steps.map((step) => (
          <div key={step.number} className="glass-card p-6 space-y-3">
            <span className="text-3xl">{step.icon}</span>
            <div className="text-sm text-primary font-mono">{step.number}</div>
            <h3 className="font-semibold text-lg">{step.title}</h3>
            <p className="text-sm text-white/50">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
