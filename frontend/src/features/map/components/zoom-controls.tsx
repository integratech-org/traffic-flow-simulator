import { Plus, Minus, Info } from "lucide-react"
import { useState } from "react"
import { useMap } from "react-leaflet"
import { MapLegend } from "@/features/analytics/components/legend"

interface ZoomControlsProps {
  isSidebarOpen?: boolean
}

export function ZoomControls({ isSidebarOpen }: ZoomControlsProps) {
  const map = useMap()
  const [showLegend, setShowLegend] = useState(false)

  const handleZoomIn = () => {
    map.zoomIn()
  }

  const handleZoomOut = () => {
    map.zoomOut()
  }

  const toggleLegend = () => {
    setShowLegend(!showLegend)
  }

  return (
    <div
      className={`absolute top-20 z-[1000] transition-all duration-300 ${isSidebarOpen ? "left-[400px]" : "left-4"}`}
    >
      {/* Zoom Control Buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="flex size-10 items-center justify-center rounded-md bg-white shadow-lg hover:bg-gray-50"
          title="Zoom In"
        >
          <Plus className="size-5" />
        </button>

        <button
          onClick={handleZoomOut}
          className="flex size-10 items-center justify-center rounded-md bg-white shadow-lg hover:bg-gray-50"
          title="Zoom Out"
        >
          <Minus className="size-5" />
        </button>

        <button
          onClick={toggleLegend}
          className={`flex size-10 items-center justify-center rounded-md shadow-lg transition-colors ${
            showLegend
              ? "bg-[#0D1628] text-white hover:bg-[#0D1628]/90"
              : "bg-white hover:bg-gray-50"
          }`}
          title="Toggle Road Indicator"
        >
          <Info className="size-5" />
        </button>
      </div>

      {/* Legend Popover */}
      {showLegend && (
        <div className="mt-2">
          <MapLegend />
        </div>
      )}
    </div>
  )
}
