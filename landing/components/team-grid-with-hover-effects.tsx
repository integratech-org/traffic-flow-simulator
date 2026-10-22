import { cn } from "@/lib/utils"

export function TeamGridWithHoverEffects() {
  const members = [
    {
      name: "Jella Anne Gonzales",
      role: "Project Manager",
      avatar: "/avatars/jella-anne-gonzales.png",
    },
    {
      name: "Nick Justine Dagum",
      role: "Fullstack Developer",
      avatar: "/avatars/nick-justine-dagum.png",
    },
    {
      name: "Anthony Amiluddin",
      role: "Software Enginner & AI Specialist",
      avatar: "/avatars/anthony-amiluddin.png",
    },
    {
      name: "Marvin Felices",
      role: "Research Lead & Frontend Developer",
      avatar: "/avatars/marvin-felices.png",
    },
    {
      name: "Mark Joseph Buenafe",
      role: "QA Specialist",
      avatar: "/avatars/mark-joseph-buenafe.png",
    },
    {
      name: "John Anthony Sansan",
      role: "Embedded Systems Engineer",
      avatar: "/avatars/john-anthony-sansan.png",
    },
    {
      name: "Lhantis Rein Cagalingan",
      role: "Hardware Infrastructure Engineer",
      avatar: "/avatars/lhantis-rein-cagalingan.png",
    },
    {
      name: "Jhon Railei Dugayo",
      role: "IoT Firmware Engineer",
      avatar: "/avatars/jhon-railei-dugayo.png",
    },
  ]
  return (
    <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 py-10 md:grid-cols-2 lg:grid-cols-4">
      {members.map((member, index) => (
        <TeamMember key={member.name} {...member} index={index} />
      ))}
    </div>
  )
}

const TeamMember = ({
  name,
  role,
  avatar,
  index,
}: {
  name: string
  role: string
  avatar: string
  index: number
}) => {
  return (
    <div
      className={cn(
        "group/feature relative flex flex-col py-10 lg:border-r dark:border-neutral-800",
        (index === 0 || index === 4) && "lg:border-l dark:border-neutral-800",
        index < 4 && "lg:border-b dark:border-neutral-800"
      )}
    >
      {index < 4 && (
        <div className="pointer-events-none absolute inset-0 h-full w-full bg-gradient-to-t from-neutral-100 to-transparent opacity-0 transition duration-200 group-hover/feature:opacity-100 dark:from-neutral-800" />
      )}
      {index >= 4 && (
        <div className="pointer-events-none absolute inset-0 h-full w-full bg-gradient-to-b from-neutral-100 to-transparent opacity-0 transition duration-200 group-hover/feature:opacity-100 dark:from-neutral-800" />
      )}
      <div className="relative z-10 mb-4 px-10 text-neutral-600 dark:text-neutral-400">
        {avatar}
      </div>
      <div className="relative z-10 mb-2 px-10 text-lg font-bold">
        <div className="absolute inset-y-0 left-0 h-6 w-1 origin-center rounded-tr-full rounded-br-full bg-neutral-300 transition-all duration-200 group-hover/feature:h-8 group-hover/feature:bg-blue-500 dark:bg-neutral-700" />
        <span className="inline-block text-neutral-800 transition duration-200 group-hover/feature:translate-x-2 dark:text-neutral-100">
          {name}
        </span>
      </div>
      <p className="relative z-10 max-w-xs px-10 text-sm text-neutral-600 dark:text-neutral-300">
        {role}
      </p>
    </div>
  )
}
