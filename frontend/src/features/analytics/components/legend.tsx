import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function MapLegend() {
  return (
    <Card className="absolute right-4 bottom-12 z-[1000] w-[340px]">
      <CardHeader>
        <CardTitle>Road Indicator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Gradient Bar */}
        <div className="h-2 w-full rounded-full bg-gradient-to-r from-green-500 via-orange-500 via-yellow-500 to-red-500" />

        {/* Legend Items */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-sm bg-red-500" />
            <span className="text-xs text-foreground">High</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="size-3 rounded-sm bg-orange-500" />
            <span className="text-xs text-foreground">Moderate</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="size-3 rounded-sm bg-green-500" />
            <span className="text-xs text-foreground">Low</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
