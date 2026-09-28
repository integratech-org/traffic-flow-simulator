const API_URL = import.meta.env.VITE_API_URL

export const fetchJson = async <T>(
  path: string,
  options?: RequestInit
): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`, options)
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${path}`)
  return res.json() as Promise<T>
}
