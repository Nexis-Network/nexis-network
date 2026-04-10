"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import type { ElevenLabs } from "@elevenlabs/elevenlabs-js"
import { Check, ChevronsUpDown, Pause, Play } from "lucide-react"

import { getVoiceColor } from "@/lib/utils/voice-colors"

import { cn } from "@/lib/utils"
import {
  AudioPlayerProvider,
  useAudioPlayer,
} from "@/components/ui/audio-player"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

const LazyOrb = dynamic(() => import("@/components/ui/orb").then((mod) => mod.Orb), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#0BA0A6] via-[#0A595C] to-[#0BA0A6] opacity-70" />
  ),
})
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface VoicePickerProps {
  voices: ElevenLabs.Voice[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function VoicePicker({
  voices,
  value,
  onValueChange,
  placeholder = "Select a voice...",
  className,
  open,
  onOpenChange,
}: VoicePickerProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen

  const selectedVoice = voices.find((v) => v.voiceId === value)

  return (
    <AudioPlayerProvider>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className={cn("w-full justify-between", className)}
          >
            {selectedVoice ? (
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="relative size-6 shrink-0 overflow-visible">
                  <LazyOrb
                    agentState="thinking"
                    resizeDebounce={250}
                    className="absolute inset-0"
                    colors={getVoiceColor(selectedVoice.voiceId ?? "")}
                  />
                </div>
                <span className="truncate">{selectedVoice.name}</span>
              </div>
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput placeholder="Search voices..." />
            <CommandList>
              <CommandEmpty>No voice found.</CommandEmpty>
              <CommandGroup>
                {voices
                  .filter((voice): voice is ElevenLabs.Voice & { voiceId: string } => Boolean(voice.voiceId))
                  .map((voice) => (
                  <VoicePickerItem
                    key={voice.voiceId}
                    voice={voice}
                    isSelected={value === voice.voiceId}
                    onSelect={() => {
                      onValueChange?.(voice.voiceId)
                    }}
                  />
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </AudioPlayerProvider>
  )
}

interface VoicePickerItemProps {
  voice: ElevenLabs.Voice
  isSelected: boolean
  onSelect: () => void
}

function VoicePickerItem({
  voice,
  isSelected,
  onSelect,
}: VoicePickerItemProps) {
  const [isHovered, setIsHovered] = React.useState(false)
  const player = useAudioPlayer()

  const voiceId = voice.voiceId ?? ""
  const preview = voice.previewUrl
  const audioItem = React.useMemo(
    () => (preview && voiceId ? { id: voiceId, src: preview, data: voice } : null),
    [preview, voiceId, voice]
  )

  const isPlaying =
    audioItem && player.isItemActive(audioItem.id) && player.isPlaying

  const handlePreview = React.useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (!audioItem) return

      if (isPlaying) {
        player.pause()
      } else {
        player.play(audioItem)
      }
    },
    [audioItem, isPlaying, player]
  )

  return (
    <CommandItem
      value={voiceId}
      onSelect={onSelect}
      className="flex items-center gap-3"
    >
      <div
        className="relative z-10 size-8 shrink-0 cursor-pointer overflow-visible"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handlePreview}
      >
        <LazyOrb
          agentState={isPlaying ? "talking" : "listening"}
          resizeDebounce={250}
          className="pointer-events-none absolute inset-0"
          colors={getVoiceColor(voiceId)}
        />
        {preview && (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white transition-opacity",
              isHovered ? "opacity-100" : "opacity-0",
            )}
          >
            {isPlaying ? (
              <Pause className="size-3" />
            ) : (
              <Play className="size-3" />
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-0.5">
        <span className="font-medium">{voice.name}</span>
        {voice.labels && (
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            {voice.labels.accent && <span>{voice.labels.accent}</span>}
            {voice.labels.gender && <span>•</span>}
            {voice.labels.gender && (
              <span className="capitalize">{voice.labels.gender}</span>
            )}
            {voice.labels.age && <span>•</span>}
            {voice.labels.age && (
              <span className="capitalize">{voice.labels.age}</span>
            )}
          </div>
        )}
      </div>

      <Check
        className={cn(
          "ml-auto size-4 shrink-0",
          isSelected ? "opacity-100" : "opacity-0"
        )}
      />
    </CommandItem>
  )
}

export { VoicePicker, VoicePickerItem }
