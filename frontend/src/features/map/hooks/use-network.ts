import { fetchNetwork, type Lane } from "@/features/map/api/get-network"
import { useEffect, useState } from "react"

export function useNetwork() {
  // keep the lane_id -> lane map: vehicles and congestion refer to lanes by id
  const [laneById, setLaneById] = useState<Record<string, Lane> | null>(null)
  const [errors, setErrors] = useState<string | null>(null)

  useEffect(() => {
    fetchNetwork()
      .then((data) => setLaneById(data.lanes))
      .catch((err) => setErrors(err.message))
  }, [])

  return { laneById, errors }
}
