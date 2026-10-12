import { CircleMarker, Tooltip } from "react-leaflet"
import type { LatLngExpression } from "leaflet"

interface DirectionMarkersProps {
  center: LatLngExpression
  activeDirection?: "north" | "south" | "east" | "west"
}

export function DirectionMarkers({
  center,
  activeDirection = "north",
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
              fillOpacity: isActive ? 1 : 0.9,
              color: "white",
              weight: isActive ? 3 : 2,
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
