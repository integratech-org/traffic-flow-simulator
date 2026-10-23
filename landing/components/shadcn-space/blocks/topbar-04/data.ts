import { CodeXml, Workflow, House } from "lucide-react"
import { NavGroup } from "./types"

const NavData: NavGroup[] = [
  {
    type: "link",
    label: "Home",
    icon: House,
    href: "/#hero",
  },
  {
    type: "link",
    label: "How it Works",
    icon: Workflow,
    href: "/#how-it-works",
  },
  {
    type: "link",
    label: "Developers",
    icon: CodeXml,
    href: "/#developers",
  },
]

export default NavData
