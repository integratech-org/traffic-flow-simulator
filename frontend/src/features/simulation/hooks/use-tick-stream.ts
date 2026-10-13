import { useEffect, useRef } from "react"
import { WS_URL, type TickMessage, type VehicleType } from "@/api/simulation"
import { useSimStore } from "../store"

/** Opens /simulation/runs/{id}/stream while a run exists and feeds the store. */
export function useTickStream(vehicleType: VehicleType | null = null) {
  const runId = useSimStore((s) => s.runId)
  const pushTick = useSimStore((s) => s.pushTick)
  const wsRef = useRef<WebSocket | null>(null)
  const filterRef = useRef(vehicleType)

  useEffect(() => {
    if (!runId) return
    const q = filterRef.current ? `?vehicle_type=${filterRef.current}` : ""
    const ws = new WebSocket(`${WS_URL}/simulation/runs/${runId}/stream${q}`)
    wsRef.current = ws
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data as string)
      if (!("error" in msg)) pushTick(msg as TickMessage)
    }
    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [runId, pushTick])

  // 2W/4W toggle: backend lets us switch the filter without reconnecting
  useEffect(() => {
    filterRef.current = vehicleType
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ vehicle_type: vehicleType }))
    }
  }, [vehicleType])
}
