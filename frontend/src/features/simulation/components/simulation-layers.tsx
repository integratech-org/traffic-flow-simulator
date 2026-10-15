import { memo, useMemo } from "react"
import { CircleMarker, Polyline, Marker, Circle } from "react-leaflet"
import type { CongestionLevel, Phase } from "@/api/simulation"
import type { Lane } from "@/features/map/api/get-network"
import { useSimStore } from "../store"

const LEVEL_COLOR: Record<CongestionLevel, string> = {
  light: "#22c55e",
  moderate: "#f97316",
  heavy: "#ef4444",
}
const PHASE_COLOR: Record<Phase, string> = {
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
}
const ACCIDENT_COLOR = "#ef4444" // Red
const ACCIDENT_RADIUS = 8 // meters
const IDLE_COLOR = { inbound: "#3388ff", outbound: "#888" } as const

// network.json is [lng, lat]; Leaflet wants [lat, lng]
const toLatLng = ([lng, lat]: [number, number]): [number, number] => [lat, lng]

const LanePolyline = memo(function LanePolyline({
  positions,
  color,
}: {
  positions: [number, number][]
  color: string
}) {
  return <Polyline positions={positions} pathOptions={{ color, weight: 4 }} />
})

export function SimulationLayers({
  laneById,
}: {
  laneById: Record<string, Lane>
}) {
  const tick = useSimStore((s) => s.tick)
  const accidents = useSimStore((s) => s.accidents)

  const laneLines = useMemo(
    () =>
      Object.entries(laneById).map(([id, lane]) => ({
        id,
        lane,
        positions: lane.cellCoords.map(toLatLng),
      })),
    [laneById]
  )

  const levelByLane = useMemo(
    () => new Map(tick?.congestion.map((c) => [c.lane_id, c.level])),
    [tick]
  )

  // a signal marker sits on the last cell (stop line) of its leg's inbound lane
  const stopLines = useMemo(() => {
    const out = new Map<string, [number, number]>()
    for (const lane of Object.values(laneById)) {
      if (lane.direction === "inbound" && lane.laneIndex === 0) {
        out.set(lane.legId, toLatLng(lane.cellCoords.at(-1)!))
      }
    }
    return out
  }, [laneById])

  return (
    <>
      {laneLines.map(({ id, lane, positions }) => {
        const level = levelByLane.get(id)
        return (
          <LanePolyline
            key={id}
            positions={positions}
            color={
              level
                ? LEVEL_COLOR[level]
                : (IDLE_COLOR[lane.direction as "inbound" | "outbound"] ??
                  "#888")
            }
          />
        )
      })}

      {tick?.signals.map((sig) => {
        const pos = stopLines.get(sig.leg_id)
        return pos ? (
          <CircleMarker
            key={sig.signal_id}
            center={pos}
            radius={8}
            pathOptions={{
              color: "white",
              weight: 2,
              fillColor: PHASE_COLOR[sig.phase],
              fillOpacity: 1,
            }}
          />
        ) : null
      })}

      {tick?.vehicles.map((v) => {
        const coord = laneById[v.lane_id]?.cellCoords[v.cell]
        if (!coord) return null

        const vehicleDisplay = useSimStore.getState().vehicleDisplay[v.type]

        return (
          <CircleMarker
            key={v.id}
            center={toLatLng(coord)}
            radius={vehicleDisplay.size}
            pathOptions={{
              stroke: false,
              fillColor: vehicleDisplay.color,
              fillOpacity: 0.95,
            }}
          />
        )
      })}

      {/* Accident Markers and Zones */}
      {accidents.map((accident) => {
        // Filter out expired accidents (if tick data is available)
        if (
          tick &&
          tick.tick >= accident.created_at_tick + accident.duration_seconds
        ) {
          return null
        }

        return (
          <div key={accident.id}>
            <Marker position={[accident.lat, accident.lon]} />
            <Circle
              center={[accident.lat, accident.lon]}
              radius={ACCIDENT_RADIUS}
              pathOptions={{
                color: ACCIDENT_COLOR,
                fillColor: ACCIDENT_COLOR,
                fillOpacity: 0.2,
                weight: 2,
              }}
            />
          </div>
        )
      })}
    </>
  )
}
