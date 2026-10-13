import { CircleMarker, Tooltip } from "react-leaflet"
import type { LatLngExpression } from "leaflet"

interface DirectionMarkersProps {
  center: LatLngExpression
  activeDirection?: "north" | "south" | "east" | "west"
  onDirectionChange?: (direction: "north" | "south" | "east" | "west") => void
}

export function DirectionMarkers({
  center,
  activeDirection = "north",
  onDirectionChange,
}: DirectionMarkersProps) {
  // Calculate positions for N, S, E, W markers relative to the center
  const [lat, lng] = center as [number, number]
  const offset = 0.0008 // Adjust this to change marker distance from center

  const directions: Array<{
    name: string
    key: "north" | "south" | "east" | "west"
    position: LatLngExpression
    color: string
  }> = [
    {
      name: "N",
      key: "north",
      position: [lat + offset, lng] as LatLngExpression,
      color: "#3b82f6",
    },
    {
      name: "S",
      key: "south",
      position: [lat - offset, lng] as LatLngExpression,
      color: "#ef4444",
    },
    {
      name: "E",
      key: "east",
      position: [lat, lng + offset] as LatLngExpression,
      color: "#f59e0b",
    },
    {
      name: "W",
      key: "west",
      position: [lat, lng - offset] as LatLngExpression,
      color: "#10b981",
    },
  ]

  return (
    <>
      {directions.map((direction) => {
        const isActive = direction.key === activeDirection
        return (
          <CircleMarker
            key={direction.name}
            center={direction.position}
            radius={isActive ? 16 : 12}
            pathOptions={{
              fillColor: direction.color,
              fillOpacity: isActive ? 1 : 0.7,
              color: "white",
              weight: isActive ? 3 : 2,
              className: "cursor-pointer",
            }}
            eventHandlers={{
              click: () => {
                if (onDirectionChange) {
                  onDirectionChange(direction.key)
                }
              },
              mouseover: (e) => {
                const target = e.target
                target.setStyle({
                  fillOpacity: 1,
                  radius: isActive ? 18 : 14,
                })
              },
              mouseout: (e) => {
                const target = e.target
                target.setStyle({
                  fillOpacity: isActive ? 1 : 0.7,
                  radius: isActive ? 16 : 12,
                })
              },
            }}
          >
            <Tooltip
              direction="top"
              offset={[0, -10]}
              opacity={1}
              permanent
              className="direction-label"
            >
              <span className="font-bold text-white">{direction.name}</span>
            </Tooltip>
          </CircleMarker>
        )
      })}
    </>
  )
}
