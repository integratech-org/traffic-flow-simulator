import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Plus, Minus } from "lucide-react"
import { useMap } from "react-leaflet"

interface ZoomControlsProps {
  isSidebarOpen?: boolean
}

export function ZoomControls({ isSidebarOpen }: ZoomControlsProps) {
  const map = useMap()

  const handleZoomIn = () => {
    map.zoomIn()
  }

  const handleZoomOut = () => {
    map.zoomOut()
  }

  return (
    <div
      className={`absolute top-20 z-[1000] flex flex-col gap-2 rounded-lg border border-border bg-background p-1 shadow-lg transition-all duration-300 ${isSidebarOpen ? "left-[400px]" : "left-4"}`}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        className="size-8 rounded-md hover:bg-muted"
        onClick={handleZoomIn}
        title="Zoom In"
      >
        <Plus className="size-4" />
      </Button>

      <Separator />

      <Button
        variant="ghost"
        size="icon-sm"
        className="size-8 rounded-md hover:bg-muted"
        onClick={handleZoomOut}
        title="Zoom Out"
      >
        <Minus className="size-4" />
      </Button>
    </div>
  )
}
