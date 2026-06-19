# Kickstart: Frontend Engineer — Day 1
## ZK-SDP Development: First 24 Hours
### Start: Now | Deliverables by End of Day

---

## Your Day 1 Mission

**Scaffold the Next.js app, set up the design system, build the landing page, and configure Cloudflare Pages deployment.**

You're the face of the product. By end of Day 1:
1. Next.js app running with dark theme
2. Landing page looking great
3. Cloudflare Pages build succeeding
4. All 6 routes stubbed out

---

## Step 1: Scaffold Next.js (20 min)

```bash
# Create Next.js app
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --no-import-alias

cd frontend

# Install dependencies
npm install @stellar/freighter-api @stellar/stellar-sdk
npm install @supabase/supabase-js
npm install @radix-ui/react-dialog @radix-ui/react-progress
npm install lucide-react class-variance-authority clsx tailwind-merge
npm install -D @cloudflare/next-on-pages

# Initialize Shadcn/UI
npx shadcn@latest init
npx shadcn@latest add button card input progress dialog table badge
```

## Step 2: Configure Dark Theme (15 min)

**File:** `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6B21A8',    // purple-900
          hover: '#581C87',       // purple-950
        },
        secondary: {
          DEFAULT: '#0EA5E9',    // sky-500
          hover: '#0284C7',       // sky-600
        },
        background: '#0F0A1A',
        surface: '#1A1030',
        success: '#10B981',
        error: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '12px',
        input: '8px',
      },
    },
  },
  plugins: [],
}

export default config
```

**File:** `src/app/globals.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-[#0F0A1A] text-white font-sans;
  }
  
  * {
    @apply border-white/10;
  }
}
```

## Step 3: Set Up Root Layout + Metadata (15 min)

**File:** `src/app/layout.tsx`

```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { template: '%s | ZK-SDP', default: 'ZK-SDP — Confidential Payroll on Stellar' },
  description: 'Privacy-preserving institutional payroll using Noir zero-knowledge proofs on Stellar Soroban.',
  openGraph: {
    title: 'ZK-SDP — Confidential Payroll on Stellar',
    description: 'Salary amounts hidden by cryptographic proof. Verified on-chain. Compliant.',
    url: 'https://zksdp.pages.dev',
    siteName: 'ZK-SDP',
    images: [{ url: '/og-zksdp.png', width: 1200, height: 630 }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
```

## Step 4: Build Landing Page (1.5 hours)

**File:** `src/app/page.tsx`

```typescript
import { HeroSection } from '@/components/landing/HeroSection'
import { HowItWorksSteps } from '@/components/landing/HowItWorksSteps'
import { TechBadges } from '@/components/landing/TechBadges'
import { Footer } from '@/components/landing/Footer'

export default function HomePage() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <HeroSection />
      <HowItWorksSteps />
      <TechBadges />
      <Footer />
    </main>
  )
}
```

**Create these components** in `src/components/landing/`:

| Component | Key Content |
|-----------|-------------|
| `<HeroSection />` | Large H1: "Payroll. Private by proof." Subtitle. Two CTA buttons: "I'm an Employer" → `/employer/connect`, "Claim My Salary" → `/withdraw` |
| `<HowItWorksSteps />` | 4-step grid: ① Upload CSV ② Commit & Deposit ③ Share Claim Links ④ Employee Claims |
| `<TechBadges />` | Row of pill badges: Stellar • Noir • UltraHonk • Poseidon2 • BN254 • Soroban |
| `<Footer />` | GitHub link, "Built for Stellar Hacks: Real-World ZK" |

**Design notes:**
- Purple gradient on primary CTA buttons
- Cards with `bg-[#1A1030]` surface, `border border-white/5`
- JetBrains Mono for any hash/address display
- Animated gradient border on the protocol diagram area

## Step 5: Stub Out All Routes (15 min)

```
src/app/page.tsx                              → Landing page (done above)
src/app/employer/connect/page.tsx             → "Connect Freighter" placeholder
src/app/employer/batch/new/page.tsx           → "Upload CSV" placeholder  
src/app/employer/batch/[id]/page.tsx          → "Dashboard" placeholder
src/app/withdraw/[payload_b64]/page.tsx       → "Withdrawal" placeholder
src/app/auditor/page.tsx                      → "Auditor" placeholder
```

Each placeholder page should have:
- The page title
- A brief description
- A "Coming soon" or "Under construction" state
- Consistent layout with the design system

## Step 6: Test Cloudflare Pages Build (15 min)

```bash
# Test build
npx @cloudflare/next-on-pages

# If successful, connect to Cloudflare Pages:
# 1. Go to https://pages.cloudflare.com/
# 2. Connect your GitHub repo
# 3. Build command: npx @cloudflare/next-on-pages
# 4. Build output: .vercel/output/static (yes, Vercel output — next-on-pages is compatible)

# Or use Wrangler CLI
npx wrangler pages deploy .vercel/output/static --project-name=zk-sdp
```

## Step 7: Configure Supabase Client (15 min)

**File:** `src/lib/supabase.ts` (create this even though you don't have the URL yet)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**File:** `.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-key
```

## Step 8: Share Your Output

By end of Day 1, post in Telegram #dev:

```
✅ Day 1 done — Frontend
- Next.js 14 scaffolded with dark theme
- Landing page: hero + steps + badges + footer
- All 6 routes stubbed out
- Cloudflare Pages build: passing
- Supabase client configured (using mock keys until BE hand-off)
- Preview: https://zksdp.pages.dev (or localhost:3000)
```

---

## What NOT to Do on Day 1

- ❌ Don't integrate Freighter wallet yet (Day 3)
- ❌ Don't build CSV upload yet (Day 2)
- ❌ Don't attempt Noir WASM integration (Day 7+)
- ❌ Don't worry about real data — use mock data

**Just scaffold + design system + landing page.**

---

## If You Get Stuck

| Problem | Try |
|---------|-----|
| Next.js build fails | Check Node.js >= 18; delete `.next/` and rebuild |
| Tailwind classes not applying | Check `tailwind.config.ts` content paths include `./src/**/*.{ts,tsx}` |
| `@cloudflare/next-on-pages` fails | Remove any Node.js-specific APIs (fs, path) from pages; move to client components |
| Shadcn components not styled | Import `globals.css` in `layout.tsx` (already done above) |

**Escalate:** Tag @pm in Telegram if stuck > 30 min.

---

*Your full hand-off doc: `planning/handoffs/FRONTEND_ENGINEER.md`*
