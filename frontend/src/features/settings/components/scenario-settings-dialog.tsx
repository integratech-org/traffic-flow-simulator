import { useState } from "react"
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

const initialSettings: ScenarioSettings = {
  day: "Monday",
  time: "8:00",
  timePeriod: "AM",
  weather: "Rainy",
  scenario: "",
}

export function ScenarioSettingsDialog({
  open,
  onOpenChange,
}: ScenarioSettingsDialogProps) {
  const [settings, setSettings] = useState<ScenarioSettings>(initialSettings)

  const handleChange = (field: keyof ScenarioSettings, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleAddAccident = () => {
    console.log("Add accident scenario")
    // TODO: Open accident configuration
  }

  const handleSave = () => {
    console.log("Saving scenario settings:", settings)
    // TODO: Send to backend
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
          <Label htmlFor="time" className="text-sm font-normal">
            Time
          </Label>
          <div className="relative">
            <Input
              id="time"
              type="text"
              value={settings.time}
              onChange={(e) => handleChange("time", e.target.value)}
              className="h-11 pr-16"
            />
            <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-foreground">
              {settings.timePeriod}
            </span>
          </div>
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
