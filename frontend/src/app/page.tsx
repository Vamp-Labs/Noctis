import { HeroSection } from '@/components/landing/HeroSection'
import { HowItWorksSteps } from '@/components/landing/HowItWorksSteps'
import { TechBadges } from '@/components/landing/TechBadges'
import { ProtocolStackDiagram } from '@/components/landing/ProtocolStackDiagram'

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-24">
      <HeroSection />
      <ProtocolStackDiagram />
      <HowItWorksSteps />
      <TechBadges />
    </div>
  )
}
