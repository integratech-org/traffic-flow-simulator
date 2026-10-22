import { Inter, JetBrains_Mono, Anton } from "next/font/google"

import "./globals.css"
import { cn } from "@/lib/utils"
import { Metadata } from "next"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const fontHeading = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-heading",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://talasim.app"),
  title: "TALA",
  description:
    "TALA is a cellular automata-based traffic simulation and signal timing optimization system for the Mindanao Avenue and Commonwealth Avenue crossing in Quezon City.",
  keywords: [
    "TALA",
    "traffic signal timing",
    "traffic simulation",
    "cellular automata",
    "Metro Manila",
    "mixed traffic",
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        fontHeading.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body>{children}</body>
    </html>
  )
}
