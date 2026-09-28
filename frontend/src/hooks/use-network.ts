import { fetchNetwork, type Lane } from "@/api/network"
import { useEffect, useState } from "react"

export function useNetwork() {
  const [lanes, setLanes] = useState<Lane[] | null>(null)
  const [errors, setErrors] = useState<string | null>(null)

  useEffect(() => {
    fetchNetwork()
      .then((data) => setLanes(Object.values(data.lanes)))
      .catch((err) => setErrors(err.message))
  }, [])

  return { lanes, errors }
}
