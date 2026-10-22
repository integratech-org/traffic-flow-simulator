"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import Sidebar from "@/components/shadcn-space/blocks/topbar-04/header/sidebar"
import {
  NavDropdown,
  NavButton,
} from "@/components/shadcn-space/blocks/topbar-04/header/desktop-nav"
import NavData from "@/components/shadcn-space/blocks/topbar-04/data"
import { NavGroup } from "@/components/shadcn-space/blocks/topbar-04/types"
import Logo from "@/assets/logo.svg"
import Image from "next/image"
import Link from "next/link"

export default function Header() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const BREAKPOINT = 1024

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= BREAKPOINT) {
        setSheetOpen(false)
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)

    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <header className="sticky top-0 z-50 h-16 border-b bg-[#F1ECEA]">
      {/* TOP BAR */}
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
        {/* LEFT */}
        <div className="flex items-center gap-3">
          {/* Mobile Sidebar */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger
              id="mobile-sidebar-trigger-04"
              className="lg:hidden"
              render={
                <Button variant="ghost" size="icon" className="cursor-pointer">
                  <Menu size={20} />
                </Button>
              }
            />

            <SheetContent side="left" className="w-75 p-0">
              <SheetTitle className="sr-only">customizer</SheetTitle>

              <ScrollArea className="h-full">
                <Link
                  href="#"
                  className="sticky top-0 z-10 flex items-center gap-2 bg-background p-4"
                >
                  <Image src={Logo} alt="logo" className="mr-1 size-6" />
                  <span className="text-lg font-bold whitespace-nowrap">
                    TALA
                  </span>
                </Link>

                <Sidebar onLinkClick={() => setSheetOpen(false)} />
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <Link href="#" className="flex items-center gap-2">
            <Image src={Logo} alt="logo" className="mr-1 size-6" />
            <span className="font-sans text-lg font-bold whitespace-nowrap">
              TALA
            </span>
          </Link>
        </div>

        {/* MIDDLE NAV (DESKTOP ONLY) */}
        <div className="hidden items-center justify-between lg:flex">
          <NavigationMenu>
            <NavigationMenuList className="space-x-0">
              {(NavData as NavGroup[]).map((item) => {
                if (item.type === "dropdown") {
                  return (
                    <NavDropdown
                      key={item.label}
                      label={item.label}
                      icon={item.icon}
                      items={item.items}
                    />
                  )
                }
                return (
                  <NavigationMenuItem key={item.label}>
                    <NavigationMenuLink
                      render={
                        <NavButton
                          label={item.label}
                          icon={item.icon}
                          href={item.href}
                        />
                      }
                    />
                  </NavigationMenuItem>
                )
              })}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2">
          <Button size="lg" className="rounded-full">
            Simulation
          </Button>
        </div>
      </div>
    </header>
  )
}
