import Link from "next/link"
import { Button } from "./ui/button"
import { Separator } from "./ui/separator"
import Facebook from "@/assets/icons/facebook.svg"
import GitHub from "@/assets/icons/github.svg"
import { cva, VariantProps } from "class-variance-authority"
import { cn } from "cn"
import Logo from "@/assets/logo.svg"

const siteLinks = [
  { label: "Home", href: "/#hero" },
  { label: "How it Works", href: "/#how-it-works" },
  { label: "Developers", href: "/#developers" },
]

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms and Condition", href: "/terms" },
]

const footerVariants = cva(
  "relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pb-6 md:gap-3 md:px-6",
  {
    variants: {
      variant: {
        light: "text-primary-foreground",
        dark: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "light",
    },
  }
)

const footerLinkVariants = cva("text-sm font-medium", {
  variants: {
    variant: {
      light: "text-primary-foreground/80 hover:text-primary-foreground",
      dark: "text-foreground/80 hover:text-foreground",
    },
  },
  defaultVariants: {
    variant: "light",
  },
})

type Props = React.ComponentProps<"footer"> &
  VariantProps<typeof footerVariants>

export function Footer({ variant = "light", className, ...props }: Props) {
  return (
    <footer className={cn(footerVariants({ variant }), className)} {...props}>
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-2xl md:text-3xl">
          <Logo className="size-7 md:size-8" />
          <span className="font-bold">TALA</span>
        </Link>

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
              className={footerLinkVariants({ variant })}
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
              className={footerLinkVariants({ variant })}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
