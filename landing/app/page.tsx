import { Hero } from "@/components/hero"
import Header from "@/components/shadcn-space/blocks/topbar-04/header"

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* MAIN CONTENT */}
      <main>
        <Hero />
      </main>
    </div>
  )
}
