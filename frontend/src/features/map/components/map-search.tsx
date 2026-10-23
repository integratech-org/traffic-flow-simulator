import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Search, X, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

interface MapSearchProps {
  onLocationSelect: (lng: number, lat: number, placeName: string) => void
  isSidebarOpen?: boolean
}

interface SearchResult {
  id: string
  place_name: string
  center: [number, number] // [lng, lat]
  place_type: string[]
}

export function MapSearch({ onLocationSelect, isSidebarOpen }: MapSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchTimeoutRef = useRef<number | undefined>(undefined)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setResults([])
      setShowResults(false)
      return
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Set new timeout
    searchTimeoutRef.current = setTimeout(() => {
      searchLocation(searchQuery)
    }, 500) // Wait 500ms after user stops typing

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowResults(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const searchLocation = async (query: string) => {
    if (!MAPBOX_TOKEN) {
      console.error("Mapbox token not found")
      return
    }

    setIsLoading(true)

    try {
      // Bias search results to Metro Manila area
      const proximity = "121.0244,14.5995" // Quezon City coordinates

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${MAPBOX_TOKEN}&proximity=${proximity}&limit=5&country=PH`
      )

      if (!response.ok) {
        throw new Error("Geocoding request failed")
      }

      const data = await response.json()
      setResults(data.features || [])
      setShowResults(true)
    } catch (error) {
      console.error("Search error:", error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectResult = (result: SearchResult) => {
    const [lng, lat] = result.center
    onLocationSelect(lng, lat, result.place_name)
    setSearchQuery(result.place_name)
    setShowResults(false)
  }

  const handleClear = () => {
    setSearchQuery("")
    setResults([])
    setShowResults(false)
  }

  return (
    <div
      ref={dropdownRef}
      className={`absolute top-4 z-[1000] transition-all duration-300 ${
        isSidebarOpen ? "left-[400px]" : "left-4"
      }`}
    >
      <div className="relative w-80">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search location in Metro Manila..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 w-full rounded-full border-border bg-background pr-10 pl-10 text-sm shadow-lg"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1/2 right-2 size-8 -translate-y-1/2 rounded-full"
              onClick={handleClear}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>

        {/* Results Dropdown */}
        {showResults && results.length > 0 && (
          <div className="absolute top-full mt-2 w-full overflow-hidden rounded-lg border border-border bg-background shadow-xl">
            {results.map((result) => (
              <button
                key={result.id}
                className="flex w-full items-start gap-3 border-b border-border p-3 text-left transition-colors last:border-b-0 hover:bg-muted"
                onClick={() => handleSelectResult(result)}
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 overflow-hidden">
                  <div className="truncate text-sm font-medium">
                    {result.place_name.split(",")[0]}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {result.place_name.split(",").slice(1).join(",")}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No Results */}
        {showResults && results.length === 0 && !isLoading && (
          <div className="absolute top-full mt-2 w-full rounded-lg border border-border bg-background p-4 text-center text-sm text-muted-foreground shadow-xl">
            No locations found
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="absolute top-full mt-2 w-full rounded-lg border border-border bg-background p-4 text-center text-sm text-muted-foreground shadow-xl">
            Searching...
          </div>
        )}
      </div>
    </div>
  )
}
