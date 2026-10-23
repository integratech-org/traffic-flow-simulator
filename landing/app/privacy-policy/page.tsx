import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Shield, Lock, Database, Eye } from "lucide-react"
import Header from "@/components/shadcn-space/blocks/topbar-04/header"
import type { Metadata } from "next"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Privacy Policy - TALA",
  description:
    "Privacy Policy for TALA traffic simulation system. Learn how we collect, use, and protect your information.",
}

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>
          <p className="mb-8 text-muted-foreground">
            <strong>Last Updated:</strong> October 2026
          </p>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">1. Introduction</h2>
            <p className="mb-4 text-muted-foreground">
              This Privacy Policy describes how TALA (&quot;we&quot;,
              &quot;us&quot;, or &quot;our&quot;) collects, uses, and protects
              information when you use our traffic flow simulation system. We
              are committed to protecting your privacy and being transparent
              about our data practices.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              2. Information We Collect
            </h2>

            <h3 className="mt-6 mb-3 text-xl font-semibold">
              2.1 Information You Provide
            </h3>
            <p className="mb-2 text-muted-foreground">
              <strong>Simulation Configuration Data:</strong>
            </p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Day of week and time settings</li>
              <li>Weather conditions selected</li>
              <li>Traffic density scenarios</li>
              <li>Vehicle mix percentages</li>
              <li>Signal timing configurations</li>
              <li>Accident placement and parameters</li>
            </ul>
            <p className="mb-4 text-muted-foreground">
              <strong>Note:</strong> This data is stored locally in your browser
              and is not transmitted to our servers unless you explicitly save
              or share scenarios.
            </p>

            <h3 className="mt-6 mb-3 text-xl font-semibold">
              2.2 Automatically Collected Information
            </h3>
            <p className="mb-2 text-muted-foreground">
              <strong>Usage Data:</strong>
            </p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Simulation run duration</li>
              <li>Number of simulations executed</li>
              <li>
                Features used (e.g., accident placement, signal adjustments)
              </li>
              <li>Browser type and version</li>
              <li>Operating system</li>
              <li>Screen resolution</li>
              <li>General location (city/country level only)</li>
            </ul>

            <p className="mb-2 text-muted-foreground">
              <strong>Technical Data:</strong>
            </p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>IP address (anonymized)</li>
              <li>Session duration</li>
              <li>Error logs and crash reports</li>
              <li>Performance metrics</li>
            </ul>

            <h3 className="mt-6 mb-3 text-xl font-semibold">
              2.3 Information We Do NOT Collect
            </h3>
            <p className="mb-2 text-muted-foreground">We do not collect:</p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>
                Personal identification information (name, email, phone number)
              </li>
              <li>Precise geolocation data</li>
              <li>Payment information (the system is free to use)</li>
              <li>Biometric data</li>
              <li>Social media profiles</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              3. How We Use Your Information
            </h2>

            <h3 className="mt-6 mb-3 text-xl font-semibold">
              3.1 Primary Uses
            </h3>
            <p className="mb-2 text-muted-foreground">
              We use collected information to:
            </p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Provide and maintain the simulation system</li>
              <li>Improve system performance and user experience</li>
              <li>Identify and fix bugs and technical issues</li>
              <li>Analyze usage patterns to enhance features</li>
              <li>Generate anonymized statistics for research purposes</li>
            </ul>

            <h3 className="mt-6 mb-3 text-xl font-semibold">
              3.2 Research and Educational Purposes
            </h3>
            <p className="mb-2 text-muted-foreground">
              Anonymized, aggregated data may be used for:
            </p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Academic research publications</li>
              <li>Educational presentations</li>
              <li>System improvement studies</li>
              <li>Traffic modeling research</li>
            </ul>
            <p className="mb-4 text-muted-foreground">
              <strong>Important:</strong> Individual user data is never
              published or shared in identifiable form.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              4. Third-Party Services
            </h2>

            <h3 className="mt-6 mb-3 text-xl font-semibold">4.1 Mapbox</h3>
            <p className="mb-2 text-muted-foreground">
              TALA uses Mapbox for map visualization. When you use the map
              features:
            </p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>
                Mapbox may collect usage data according to their privacy policy
              </li>
              <li>Map tile requests are sent to Mapbox servers</li>
              <li>Your IP address may be visible to Mapbox</li>
            </ul>
            <p className="mb-4 text-muted-foreground">
              <strong>Mapbox Privacy Policy:</strong>{" "}
              <a
                href="https://www.mapbox.com/legal/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                https://www.mapbox.com/legal/privacy
              </a>
            </p>

            <h3 className="mt-6 mb-3 text-xl font-semibold">
              4.2 Geocoding Services
            </h3>
            <p className="mb-2 text-muted-foreground">
              When using the search feature:
            </p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Location search queries are sent to Mapbox Geocoding API</li>
              <li>Search terms and results are processed by Mapbox</li>
              <li>We do not store your search history</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              5. Data Storage and Security
            </h2>

            <h3 className="mt-6 mb-3 text-xl font-semibold">
              5.1 Local Storage
            </h3>
            <p className="mb-2 text-muted-foreground">
              Most of your data is stored locally in your browser using:
            </p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>LocalStorage (simulation configurations)</li>
              <li>SessionStorage (temporary session data)</li>
            </ul>
            <p className="mb-4 text-muted-foreground">
              <strong>You control this data</strong> and can clear it at any
              time through your browser settings.
            </p>

            <h3 className="mt-6 mb-3 text-xl font-semibold">
              5.2 Server-Side Data
            </h3>
            <p className="mb-2 text-muted-foreground">
              If we collect analytics data:
            </p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Data is stored securely on our servers</li>
              <li>Data is encrypted in transit (HTTPS)</li>
              <li>Access is restricted to authorized personnel only</li>
              <li>Data retention: 12 months maximum</li>
            </ul>

            <h3 className="mt-6 mb-3 text-xl font-semibold">
              5.3 Security Measures
            </h3>
            <p className="mb-2 text-muted-foreground">
              We implement reasonable security measures including:
            </p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Encryption of data in transit</li>
              <li>Secure server configurations</li>
              <li>Regular security updates</li>
              <li>Access controls and authentication</li>
            </ul>
            <p className="mb-4 text-muted-foreground">
              <strong>However,</strong> no system is 100% secure. We cannot
              guarantee absolute security of your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              6. Cookies and Tracking
            </h2>

            <h3 className="mt-6 mb-3 text-xl font-semibold">
              6.1 Cookies We Use
            </h3>
            <p className="mb-2 text-muted-foreground">
              <strong>Essential Cookies:</strong>
            </p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Session management</li>
              <li>User preferences (theme, language)</li>
              <li>Security tokens</li>
            </ul>

            <p className="mb-2 text-muted-foreground">
              <strong>Analytics Cookies (if applicable):</strong>
            </p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Usage statistics</li>
              <li>Feature adoption rates</li>
              <li>Performance monitoring</li>
            </ul>

            <h3 className="mt-6 mb-3 text-xl font-semibold">
              6.2 Your Cookie Choices
            </h3>
            <p className="mb-4 text-muted-foreground">
              You can control cookies through your browser settings. Note that
              disabling essential cookies may affect system functionality.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              7. Your Rights and Choices
            </h2>

            <h3 className="mt-6 mb-3 text-xl font-semibold">
              7.1 Access and Control
            </h3>
            <p className="mb-2 text-muted-foreground">You have the right to:</p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>
                Access your locally stored data through browser developer tools
              </li>
              <li>Delete your local data by clearing browser storage</li>
              <li>
                Request information about any server-side data we hold (if
                applicable)
              </li>
            </ul>

            <h3 className="mt-6 mb-3 text-xl font-semibold">
              7.2 Opt-Out Options
            </h3>
            <p className="mb-2 text-muted-foreground">You can opt out of:</p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Analytics tracking (via browser settings or extensions)</li>
              <li>Third-party cookies (via browser settings)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              8. Children&apos;s Privacy
            </h2>
            <p className="mb-4 text-muted-foreground">
              TALA is designed for educational use but is not specifically
              directed at children under 13. We do not knowingly collect
              personal information from children under 13. If we become aware of
              such collection, we will delete it promptly.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              9. International Users
            </h2>
            <p className="mb-4 text-muted-foreground">
              TALA is operated from the Philippines. If you access the system
              from outside the Philippines, your information may be transferred
              to, stored, and processed in the Philippines, where data
              protection laws may differ from your jurisdiction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">10. Data Retention</h2>

            <h3 className="mt-6 mb-3 text-xl font-semibold">10.1 Local Data</h3>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Stored indefinitely in your browser until you clear it</li>
              <li>Under your complete control</li>
            </ul>

            <h3 className="mt-6 mb-3 text-xl font-semibold">
              10.2 Server Data (if applicable)
            </h3>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Usage logs: 12 months</li>
              <li>Error reports: 6 months</li>
              <li>Aggregated statistics: Indefinitely (anonymized)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              11. Changes to This Privacy Policy
            </h2>
            <p className="mb-4 text-muted-foreground">
              We may update this Privacy Policy periodically. Changes will be
              posted on this page with an updated &quot;Last Updated&quot; date.
              Significant changes will be prominently announced.
            </p>
            <p className="mb-4 text-muted-foreground">
              Your continued use of TALA after changes constitutes acceptance of
              the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              12. Academic Research Context
            </h2>
            <p className="mb-2 text-muted-foreground">
              TALA was developed as an academic research project. Any data
              collected is used primarily for:
            </p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Improving the simulation model</li>
              <li>Academic publications (anonymized and aggregated)</li>
              <li>Educational demonstrations</li>
              <li>System development and maintenance</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              13. Your California Privacy Rights (CCPA)
            </h2>
            <p className="mb-2 text-muted-foreground">
              If you are a California resident, you have additional rights under
              the California Consumer Privacy Act:
            </p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Right to know what personal information is collected</li>
              <li>Right to delete personal information</li>
              <li>
                Right to opt-out of sale of personal information (Note: We do
                not sell your information)
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              14. GDPR Compliance (EU Users)
            </h2>
            <p className="mb-2 text-muted-foreground">
              If you are in the European Union, you have rights under GDPR:
            </p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Right to access your personal data</li>
              <li>Right to rectification</li>
              <li>Right to erasure (&quot;right to be forgotten&quot;)</li>
              <li>Right to data portability</li>
              <li>Right to object to processing</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">15. Contact Us</h2>
            <p className="mb-2 text-muted-foreground">
              If you have questions or concerns about this Privacy Policy or our
              data practices:
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
            <p className="mb-4 text-sm text-muted-foreground">
              For privacy-specific inquiries, please include &quot;Privacy
              Policy&quot; in your email subject line.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">
              16. Data Protection Officer
            </h2>
            <p className="mb-2 text-muted-foreground">
              For formal privacy requests or concerns:
            </p>
            <div className="mb-4 rounded-md bg-muted p-4">
              <p className="mb-2 font-semibold">Data Protection Contact</p>
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
                Response Time: Within 30 days of request
              </p>
            </div>
          </section>

          <div className="mt-12 border-t pt-6">
            <h2 className="mb-4 text-2xl font-semibold">Summary</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <Database className="mt-1 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="mb-1 font-semibold">What we collect</p>
                  <p className="text-sm text-muted-foreground">
                    Usage data, simulation configurations (locally stored),
                    technical data
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Eye className="mt-1 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="mb-1 font-semibold">Why</p>
                  <p className="text-sm text-muted-foreground">
                    To provide the service and improve the system
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="mt-1 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="mb-1 font-semibold">Your control</p>
                  <p className="text-sm text-muted-foreground">
                    You can delete local data anytime
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Lock className="mt-1 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="mb-1 font-semibold">Sharing</p>
                  <p className="text-sm text-muted-foreground">
                    We do not sell or share personal data; aggregated anonymized
                    data may be used for research
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-6 text-center text-muted-foreground">
              <strong>
                By using Tala, you consent to this Privacy Policy.
              </strong>
            </p>
          </div>
        </article>
      </main>

      <Footer variant="dark" />
    </div>
  )
}
