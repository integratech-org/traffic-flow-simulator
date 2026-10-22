import { CtaFooter } from "@/components/cta-footer"
import { Developers } from "@/components/developers"
import { Hero } from "@/components/hero"
import { HowItWorks } from "@/components/how-it-works"
import Header from "@/components/shadcn-space/blocks/topbar-04/header"

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* MAIN CONTENT */}
      <main>
        <Hero />
        <HowItWorks />
        <Developers />
        <CtaFooter />
      </main>
    </div>
  )
}
