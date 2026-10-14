import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X } from "lucide-react"
import { useSimStore } from "@/features/simulation/store"

interface ScenarioSettings {
  day: string
  time: string
  timePeriod: "AM" | "PM"
  weather: string
  scenario: string
}

interface ScenarioSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ScenarioSettingsDialog({
  open,
  onOpenChange,
}: ScenarioSettingsDialogProps) {
  const simConfig = useSimStore((s) => s.config)
  const patchConfig = useSimStore((s) => s.patchConfig)

  // Validation errors state
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Map backend weather values to frontend display values
  const weatherDisplayMap: Record<string, string> = {
    clear: "Sunny",
    cloudy: "Cloudy",
    rainy: "Rainy",
  }

  const [settings, setSettings] = useState<ScenarioSettings>(() => ({
    day:
      simConfig.day_of_week.charAt(0).toUpperCase() +
      simConfig.day_of_week.slice(1),
    time: simConfig.time,
    timePeriod: "AM",
    weather: weatherDisplayMap[simConfig.weather_condition] || "Sunny",
    scenario: "",
  }))

  // Sync with store when dialog opens
  useEffect(() => {
    if (open) {
      setSettings({
        day:
          simConfig.day_of_week.charAt(0).toUpperCase() +
          simConfig.day_of_week.slice(1),
        time: simConfig.time,
        timePeriod: "AM",
        weather: weatherDisplayMap[simConfig.weather_condition] || "Sunny",
        scenario: "",
      })
      // Clear errors when dialog opens
      setErrors({})
    }
  }, [open, simConfig.day_of_week, simConfig.time, simConfig.weather_condition])

  const handleChange = (field: keyof ScenarioSettings, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Clear error for this field when user changes it
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleAddAccident = () => {
    console.log("Add Accident feature coming soon")
  }

  const validateSettings = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(settings.time)) {
      newErrors.time = "Invalid time format. Use HH:MM (e.g., 08:30)"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!validateSettings()) {
      return
    }

    // Map frontend values to backend schema
    const weatherMap: Record<string, "clear" | "rainy"> = {
      Sunny: "clear",
      Rainy: "rainy",
    }

    patchConfig({
      day_of_week: settings.day.toLowerCase() as
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
        | "sunday",
      time: settings.time,
      weather_condition: weatherMap[settings.weather] || "clear",
    })
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <Card className="absolute top-20 right-4 z-[1000] w-[340px] shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between px-5 pb-3">
        <CardTitle className="text-base">Scenario and Conditions</CardTitle>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-6 rounded-md hover:bg-muted"
          onClick={() => onOpenChange(false)}
        >
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-4">
        {/* Day */}
        <div className="space-y-2">
          <Label htmlFor="day" className="text-sm font-normal">
            Day
          </Label>
          <Select
            value={settings.day}
            onValueChange={(value) => value && handleChange("day", value)}
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent
              side="bottom"
              align="start"
              alignItemWithTrigger={false}
            >
              <SelectItem value="Monday">Monday</SelectItem>
              <SelectItem value="Tuesday">Tuesday</SelectItem>
              <SelectItem value="Wednesday">Wednesday</SelectItem>
              <SelectItem value="Thursday">Thursday</SelectItem>
              <SelectItem value="Friday">Friday</SelectItem>
              <SelectItem value="Saturday">Saturday</SelectItem>
              <SelectItem value="Sunday">Sunday</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Time */}
        <div className="space-y-2">
          <Label
            htmlFor="time"
            className={`text-sm font-normal ${errors.time ? "text-red-500" : ""}`}
          >
            Time
          </Label>
          <div className="relative">
            <Input
              id="time"
              type="text"
              placeholder="HH:MM"
              value={settings.time}
              onChange={(e) => handleChange("time", e.target.value)}
              className={`h-11 pr-16 ${errors.time ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            />
            <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-foreground">
              {settings.timePeriod}
            </span>
          </div>
          {errors.time && <p className="text-sm text-red-500">{errors.time}</p>}
        </div>

        {/* Weather */}
        <div className="space-y-2">
          <Label htmlFor="weather" className="text-sm font-normal">
            Weather
          </Label>
          <Select
            value={settings.weather}
            onValueChange={(value) => value && handleChange("weather", value)}
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue placeholder="Select weather" />
            </SelectTrigger>
            <SelectContent
              side="bottom"
              align="start"
              sticky={true}
              alignItemWithTrigger={false}
            >
              <SelectItem value="Sunny">Sunny</SelectItem>
              <SelectItem value="Rainy">Rainy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Scenario */}
        <div className="space-y-2">
          <Label htmlFor="scenario" className="text-sm font-normal">
            Scenario
          </Label>
          <Button
            variant="outline"
            className="h-11 w-full justify-center"
            onClick={handleAddAccident}
          >
            Add Accident
          </Button>
        </div>

        <Separator />

        {/* Save Button */}
        <Button
          onClick={handleSave}
          className="h-11 w-full bg-[#0D1628] hover:bg-[#0D1628]/90"
        >
          Save Scenario and Conditions
        </Button>
      </CardContent>
    </Card>
  )
}
