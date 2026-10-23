import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Header from "@/components/shadcn-space/blocks/topbar-04/header"
import type { Metadata } from "next"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Terms and Conditions - TALA",
  description:
    "Terms and Conditions for TALA traffic simulation system. Educational and research use terms.",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-7xl p-4 md:p-6">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <article className="prose prose-gray max-w-none">
          <h1 className="mb-2 text-4xl font-bold md:text-5xl">
            Terms and Conditions
          </h1>
          <p className="mb-8 text-muted-foreground">
            <strong>Last Updated:</strong> October 2026
          </p>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">1. Introduction</h2>
            <p className="mb-4 text-muted-foreground">
              Welcome to TALA, a traffic flow simulation system developed for
              educational and research purposes. By accessing or using TALA, you
              agree to be bound by these Terms and Conditions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              2. Acceptance of Terms
            </h2>
            <p className="mb-4 text-muted-foreground">
              By using TALA, you acknowledge that you have read, understood, and
              agree to be bound by these Terms and Conditions. If you do not
              agree to these terms, please do not use the system.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              3. Use of the System
            </h2>

            <h3 className="mt-6 mb-3 text-xl font-semibold">
              3.1 Permitted Use
            </h3>
            <p className="mb-2 text-muted-foreground">TALA is provided for:</p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Educational purposes</li>
              <li>Research and academic study</li>
              <li>Traffic flow analysis and simulation</li>
              <li>Transportation planning evaluation</li>
            </ul>

            <h3 className="mt-6 mb-3 text-xl font-semibold">
              3.2 Prohibited Use
            </h3>
            <p className="mb-2 text-muted-foreground">You agree NOT to:</p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Use the system for any illegal or unauthorized purpose</li>
              <li>
                Attempt to gain unauthorized access to any part of the system
              </li>
              <li>Interfere with or disrupt the system&apos;s operation</li>
              <li>
                Use the system to violate any applicable laws or regulations
              </li>
              <li>
                Reverse engineer, decompile, or disassemble any part of the
                software
              </li>
              <li>Remove or modify any copyright or proprietary notices</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              4. Intellectual Property
            </h2>

            <h3 className="mt-6 mb-3 text-xl font-semibold">4.1 Ownership</h3>
            <p className="mb-4 text-muted-foreground">
              TALA and all associated intellectual property rights remain the
              property of the developers and their affiliated institution.
            </p>

            <h3 className="mt-6 mb-3 text-xl font-semibold">4.2 License</h3>
            <p className="mb-4 text-muted-foreground">
              Subject to these terms, we grant you a limited, non-exclusive,
              non-transferable license to use TALA for permitted purposes only.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              5. Simulation Data and Results
            </h2>

            <h3 className="mt-6 mb-3 text-xl font-semibold">5.1 Accuracy</h3>
            <p className="mb-4 text-muted-foreground">
              While TALA strives to provide accurate traffic flow simulations
              based on the Nagel-Schreckenberg cellular automaton model and
              real-world data, simulation results are approximations and should
              not be used as the sole basis for real-world traffic management
              decisions.
            </p>

            <h3 className="mt-6 mb-3 text-xl font-semibold">5.2 No Warranty</h3>
            <p className="mb-4 text-muted-foreground">
              The simulation results are provided &quot;as is&quot; without any
              warranty of accuracy, completeness, or fitness for a particular
              purpose.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">6. User Data</h2>

            <h3 className="mt-6 mb-3 text-xl font-semibold">
              6.1 Simulation Configurations
            </h3>
            <p className="mb-4 text-muted-foreground">
              Any simulation configurations, scenarios, or settings you create
              remain your property.
            </p>

            <h3 className="mt-6 mb-3 text-xl font-semibold">6.2 Usage Data</h3>
            <p className="mb-4 text-muted-foreground">
              We may collect anonymized usage data to improve the system. See
              our{" "}
              <Link
                href="/privacy-policy"
                className="text-primary hover:underline"
              >
                Privacy Policy
              </Link>{" "}
              for details.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              7. Disclaimer of Warranties
            </h2>
            <p className="mb-2 text-muted-foreground">
              TALA is provided &quot;AS IS&quot; and &quot;AS AVAILABLE&quot;
              without warranties of any kind, either express or implied,
              including but not limited to:
            </p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Merchantability</li>
              <li>Fitness for a particular purpose</li>
              <li>Non-infringement</li>
              <li>Uninterrupted or error-free operation</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              8. Limitation of Liability
            </h2>
            <p className="mb-2 text-muted-foreground">
              To the maximum extent permitted by law, the developers and
              affiliated institution shall not be liable for:
            </p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>
                Any indirect, incidental, special, consequential, or punitive
                damages
              </li>
              <li>Loss of profits, data, or business opportunities</li>
              <li>
                Any damages arising from your use or inability to use TALA
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              9. Third-Party Services
            </h2>
            <p className="mb-2 text-muted-foreground">
              TALA uses third-party services including:
            </p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Mapbox (for map visualization)</li>
              <li>Other mapping and geocoding services</li>
            </ul>
            <p className="mb-4 text-muted-foreground">
              Your use of these services is subject to their respective terms
              and conditions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              10. Modifications to Terms
            </h2>
            <p className="mb-4 text-muted-foreground">
              We reserve the right to modify these Terms and Conditions at any
              time. Changes will be effective immediately upon posting. Your
              continued use of TALA after changes constitutes acceptance of the
              modified terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              11. Academic Use and Citation
            </h2>

            <h3 className="mt-6 mb-3 text-xl font-semibold">
              11.1 Research Use
            </h3>
            <p className="mb-4 text-muted-foreground">
              If you use TALA for academic research, we request that you cite it
              appropriately in your publications.
            </p>

            <h3 className="mt-6 mb-3 text-xl font-semibold">
              11.2 Suggested Citation
            </h3>
            <div className="mb-4 rounded-md bg-muted p-4">
              <pre className="font-mono text-sm whitespace-pre-wrap text-muted-foreground">
                TALA Traffic Simulation System (2026).{"\n"}
                Developed for traffic flow analysis at Commonwealth Avenue -
                Mindanao Avenue intersection.{"\n"}
                Based on Nagel-Schreckenberg cellular automaton model with MOBIL
                lane-changing.
              </pre>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              12. System Availability
            </h2>
            <p className="mb-2 text-muted-foreground">
              We do not guarantee that TALA will be available at all times. The
              system may be temporarily unavailable for:
            </p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Maintenance</li>
              <li>Updates</li>
              <li>Technical issues</li>
              <li>Other reasons beyond our control</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">13. Governing Law</h2>
            <p className="mb-4 text-muted-foreground">
              These Terms and Conditions shall be governed by and construed in
              accordance with the laws of the Republic of the Philippines.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">14. Severability</h2>
            <p className="mb-4 text-muted-foreground">
              If any provision of these Terms is found to be invalid or
              unenforceable, the remaining provisions shall continue in full
              force and effect.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              15. Entire Agreement
            </h2>
            <p className="mb-4 text-muted-foreground">
              These Terms and Conditions, together with our Privacy Policy,
              constitute the entire agreement between you and TALA regarding
              your use of the system.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              16. Contact Information
            </h2>
            <p className="mb-2 text-muted-foreground">
              For questions about these Terms and Conditions, please contact:
            </p>
            <div className="mb-4 rounded-md bg-muted p-4">
              <p className="mb-2 font-semibold">TALA Development Team</p>
              <p className="mb-1 text-sm text-muted-foreground">
                Email:{" "}
                <a
                  href="mailto:integratechno.org@gmail.com"
                  className="text-primary hover:underline"
                >
                  integratechno.org@gmail.com
                </a>
              </p>
              <p className="text-sm text-muted-foreground">
                Institution: University of Caloocan City
              </p>
            </div>
          </section>

          <div className="mt-12 border-t pt-6">
            <p className="text-center text-muted-foreground">
              <strong>
                By using TALA, you acknowledge that you have read and understood
                these Terms and Conditions and agree to be bound by them.
              </strong>
            </p>
          </div>
        </article>
      </main>

      <Footer variant="dark" />
    </div>
  )
}
