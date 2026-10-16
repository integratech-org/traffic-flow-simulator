import { memo, useMemo } from "react"
import { CircleMarker, Polyline, Marker, Circle } from "react-leaflet"
import L from "leaflet" // TASK9: For DivIcon
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

// TASK9: Arrow decorations for directional flow
const ARROW_SPACING = 15 // Show arrow every N cells
const ARROW_SIZE = 8 // Size of arrow in pixels
const ARROW_COLOR = "rgba(255, 255, 255, 0.6)" // Semi-transparent white

// TASK7: Visual lane widening - offset distance per lane in meters
const LANE_OFFSET_METERS = 3.5 // meters lateral offset per lane index
const METERS_PER_DEGREE_LAT = 111320 // approximate meters per degree latitude
const LANE_WIDTH_BASE = 2.5 // base polyline weight
const LANE_WIDTH_PER_LANE = 1 // additional weight per lane

// network.json is [lng, lat]; Leaflet wants [lat, lng]
const toLatLng = ([lng, lat]: [number, number]): [number, number] => [lat, lng]

/**
 * TASK7: Calculate perpendicular offset for a coordinate based on bearing
 * Offsets coordinates laterally to visually separate parallel lanes
 */
function calculatePerpendicularOffset(
  coord: [number, number],
  nextCoord: [number, number] | undefined,
  laneIndex: number,
  offsetMeters: number
): [number, number] {
  if (laneIndex === 0 || !nextCoord) {
    return coord // Lane 0 stays at center, or last point no offset
  }

  const [lng1, lat1] = coord
  const [lng2, lat2] = nextCoord

  // Calculate bearing (direction of travel)
  const dLng = lng2 - lng1
  const dLat = lat2 - lat1
  const bearing = Math.atan2(dLng, dLat) // radians

  // Perpendicular direction (90 degrees to the right)
  const perpBearing = bearing + Math.PI / 2

  // Calculate offset in degrees
  // Offset to the right for higher lane indices
  const offset = (laneIndex * offsetMeters) / METERS_PER_DEGREE_LAT
  const latOffset = offset * Math.cos(perpBearing)
  const lngOffset =
    offset * Math.sin(perpBearing) * Math.cos((lat1 * Math.PI) / 180)

  return [lng1 + lngOffset, lat1 + latOffset]
}

/**
 * TASK7: Generate offset coordinates for a lane based on its laneIndex
 */
function generateOffsetCoordinates(
  coords: [number, number][],
  laneIndex: number
): [number, number][] {
  if (laneIndex === 0) {
    return coords // Lane 0 (rightmost/center) stays at original position
  }

  return coords.map((coord, i) => {
    const nextCoord = coords[i + 1]
    return calculatePerpendicularOffset(
      coord,
      nextCoord,
      laneIndex,
      LANE_OFFSET_METERS
    )
  })
}

/**
 * TASK9: Calculate bearing (angle) between two coordinates for arrow rotation
 */
function calculateBearing(
  from: [number, number],
  to: [number, number]
): number {
  const [lng1, lat1] = from
  const [lng2, lat2] = to
  const dLng = lng2 - lng1
  const dLat = lat2 - lat1
  // Return angle in degrees (0 = north, 90 = east, 180 = south, 270 = west)
  const angle = (Math.atan2(dLng, dLat) * 180) / Math.PI
  return angle
}

/**
 * TASK9: Generate arrow positions along a lane at regular intervals
 */
function generateArrowPositions(
  coords: [number, number][],
  spacing: number
): Array<{ position: [number, number]; rotation: number }> {
  const arrows: Array<{ position: [number, number]; rotation: number }> = []

  // Place arrows at regular intervals
  for (let i = spacing; i < coords.length; i += spacing) {
    const position = coords[i]
    const prevPosition = coords[i - 1] || coords[i]
    const nextPosition = coords[i + 1] || coords[i]

    // Calculate bearing for arrow rotation
    const rotation = calculateBearing(prevPosition, nextPosition)

    arrows.push({ position, rotation })
  }

  return arrows
}

const LanePolyline = memo(function LanePolyline({
  positions,
  color,
  weight,
}: {
  positions: [number, number][]
  color: string
  weight: number
}) {
  return <Polyline positions={positions} pathOptions={{ color, weight }} />
})

const DirectionalArrow = memo(function DirectionalArrow({
  position,
  rotation,
}: {
  position: [number, number]
  rotation: number
}) {
  // Create arrow using DivIcon with CSS rotation
  const icon = L.divIcon({
    html: `
      <div style="
        transform: rotate(${rotation}deg);
        width: ${ARROW_SIZE}px;
        height: ${ARROW_SIZE}px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="${ARROW_SIZE}" height="${ARROW_SIZE}" viewBox="0 0 24 24" fill="${ARROW_COLOR}" stroke="${ARROW_COLOR}" stroke-width="2">
          <path d="M12 5 L12 19 M12 5 L7 10 M12 5 L17 10"/>
        </svg>
      </div>
    `,
    className: "directional-arrow",
    iconSize: [ARROW_SIZE, ARROW_SIZE],
    iconAnchor: [ARROW_SIZE / 2, ARROW_SIZE / 2],
  })

  return <Marker position={position} icon={icon} />
})

export function SimulationLayers({
  laneById,
}: {
  laneById: Record<string, Lane>
}) {
  const tick = useSimStore((s) => s.tick)
  const accidents = useSimStore((s) => s.accidents)

  // TASK7: Calculate lane count per leg+direction for visual width
  const laneCountByLegDir = useMemo(() => {
    const counts = new Map<string, number>()
    for (const lane of Object.values(laneById)) {
      const key = `${lane.legId}_${lane.direction}`
      counts.set(key, Math.max(counts.get(key) || 0, lane.laneIndex + 1))
    }
    return counts
  }, [laneById])

  // TASK7: Generate offset lane lines with adjusted width
  const laneLines = useMemo(
    () =>
      Object.entries(laneById).map(([id, lane]) => {
        const offsetCoords = generateOffsetCoordinates(
          lane.cellCoords,
          lane.laneIndex
        )
        const laneCount =
          laneCountByLegDir.get(`${lane.legId}_${lane.direction}`) || 1
        const weight = LANE_WIDTH_BASE + LANE_WIDTH_PER_LANE * laneCount

        return {
          id,
          lane,
          positions: offsetCoords.map(toLatLng),
          weight,
        }
      }),
    [laneById, laneCountByLegDir]
  )

  // TASK9: Generate arrow markers for each lane
  const laneArrows = useMemo(
    () =>
      Object.entries(laneById).flatMap(([id, lane]) => {
        const offsetCoords = generateOffsetCoordinates(
          lane.cellCoords,
          lane.laneIndex
        )
        const arrows = generateArrowPositions(offsetCoords, ARROW_SPACING)

        return arrows.map((arrow, idx) => ({
          id: `${id}_arrow_${idx}`,
          position: toLatLng(arrow.position),
          rotation: arrow.rotation,
        }))
      }),
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
      {laneLines.map(({ id, lane, positions, weight }) => {
        const level = levelByLane.get(id)
        return (
          <LanePolyline
            key={id}
            positions={positions}
            weight={weight}
            color={
              level
                ? LEVEL_COLOR[level]
                : (IDLE_COLOR[lane.direction as "inbound" | "outbound"] ??
                  "#888")
            }
          />
        )
      })}

      {/* TASK9: Directional arrows showing traffic flow */}
      {laneArrows.map((arrow) => (
        <DirectionalArrow
          key={arrow.id}
          position={arrow.position}
          rotation={arrow.rotation}
        />
      ))}

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
        const lane = laneById[v.lane_id]
        if (!lane) return null

        const coord = lane.cellCoords[v.cell]
        if (!coord) return null

        // TASK7: Apply same offset to vehicle position as lane rendering
        const nextCoord = lane.cellCoords[v.cell + 1]
        const offsetCoord = calculatePerpendicularOffset(
          coord,
          nextCoord,
          lane.laneIndex,
          LANE_OFFSET_METERS
        )

        const vehicleDisplay = useSimStore.getState().vehicleDisplay[v.type]

        return (
          <CircleMarker
            key={v.id}
            center={toLatLng(offsetCoord)}
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
