import { LucideIcon } from "lucide-react"

export interface NavItem {
  label: string
  icon: LucideIcon
  href: string
}

export interface NavDropdown {
  type: "dropdown"
  label: string
  icon: LucideIcon
  items: NavItem[]
}

export interface NavLink {
  type: "link"
  label: string
  icon: LucideIcon
  href: string
}

export type NavGroup = NavLink | NavDropdown
