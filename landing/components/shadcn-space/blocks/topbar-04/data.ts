import { CodeXml, Workflow, House } from "lucide-react"
import { NavGroup } from "./types"

const NavData: NavGroup[] = [
  {
    type: "link",
    label: "Home",
    icon: House,
    href: "#",
  },
  {
    type: "link",
    label: "How it Works",
    icon: Workflow,
    href: "#",
  },
  {
    type: "link",
    label: "Developers",
    icon: CodeXml,
    href: "#",
  },
]

export default NavData

