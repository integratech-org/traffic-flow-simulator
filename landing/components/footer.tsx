import Link from "next/link"
import { Button } from "./ui/button"
import { Separator } from "./ui/separator"
import Facebook from "@/assets/icons/facebook.svg"
import GitHub from "@/assets/icons/github.svg"

const siteLinks = [
  { label: "Home", href: "#hero" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Developers", href: "#developers" },
]

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms and Condition", href: "/terms" },
]

export function Footer() {
  return (
    <footer className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pb-6 text-primary-foreground md:gap-3 md:px-6">
      <div className="flex items-center justify-between">
        <span className="text-2xl md:text-3xl">TALA</span>

        <div className="flex gap-3 md:gap-4">
          <Button
            size="icon-sm"
            variant="secondary"
            nativeButton={false}
            render={
              <a
                href="https://www.facebook.com/people/IntegraTech/61592806334500/"
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <Facebook />
          </Button>

          <Button
            size="icon-sm"
            variant="secondary"
            nativeButton={false}
            render={
              <a
                href="https://github.com/integratech-org"
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <GitHub />
          </Button>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <nav className="flex flex-wrap gap-x-6 gap-y-2 md:gap-x-8">
          {siteLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {legalLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
