"use client";

import { useEffect, useMemo, useRef } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

import { useIsDarkMode } from "@/hooks/ui/use-is-dark-mode"

const PERLIN_TEXTURE_PATH = "/textures/perlin-noise.png"

export type AgentState = null | "thinking" | "listening" | "talking"

export type OrbVariant = "solana" | "solana-devnet" | "eth" | "bitcoin" | "agent" | "user"

export const ORB_VARIANT_COLORS: Record<OrbVariant, [string, string]> = {
  solana: ["#9b27ff", "#00ffb0"],
  "solana-devnet": ["#9b27ff", "#00ffb0"],
  eth: ["#627EEA", "#9FAEF5"],
  bitcoin: ["#F7931A", "#FFC15A"],
  agent: ["#7C3AED", "#C084FC"],
  user: ["#0B4F83", "#22D3EE"], // Adjusted default User colors to match the deep blue/cyan of the image better
}

// Extended colors for variants that support 3-color gradients
export const ORB_VARIANT_COLORS_EXTENDED: Partial<Record<OrbVariant, [string, string, string]>> = {
  solana: ["#9b27ff", "#3a7bd5", "#00ffb0"],
  "solana-devnet": ["#9b27ff", "#3a7bd5", "#00ffb0"],
}

type OrbProps = {
  colors?: [string, string] | [string, string, string]
  variant?: OrbVariant
  colorsRef?: React.RefObject<[string, string] | [string, string, string]>
  resizeDebounce?: number
  seed?: number
  agentState?: AgentState
  volumeMode?: "auto" | "manual"
  manualInput?: number
  manualOutput?: number
  inputVolumeRef?: React.RefObject<number>
  outputVolumeRef?: React.RefObject<number>
  getInputVolume?: () => number
  getOutputVolume?: () => number
  className?: string
  /** Override device pixel ratio; default boosts clarity to avoid blur on scaled-down or HiDPI canvases */
  dpr?: number | [number, number]
}

export function Orb({
  colors,
  variant = "user",
  colorsRef,
  resizeDebounce = 100,
  seed,
  agentState = "listening",
  volumeMode = "auto",
  manualInput,
  manualOutput,
  inputVolumeRef,
  outputVolumeRef,
  getInputVolume,
  getOutputVolume,
  className,
  dpr,
}: OrbProps) {
  const isDarkMode = useIsDarkMode()
  const resolvedColors = useMemo<[string, string] | [string, string, string]>(() => {
    if (colors) {
      return colors
    }
    const extended = ORB_VARIANT_COLORS_EXTENDED[variant ?? "user"]
    if (extended) {
      return extended
    }
    const twoColor = ORB_VARIANT_COLORS[variant ?? "user"] ?? ORB_VARIANT_COLORS.user
    return twoColor
  }, [colors, variant])

  const containerRef = useRef<HTMLDivElement>(null)

  const containerClasses = className
    ? `${className}`
    : "relative h-full w-full"

  return (
    <div
      ref={containerRef}
      className={containerClasses}
    >
      <div className="bg-transparent relative h-full w-full flex items-center justify-center">
        <div className="h-full w-full">
          <Canvas
            dpr={dpr ?? [1.5, 2.5]}
            resize={{ debounce: resizeDebounce }}
            gl={{
              alpha: true,
              antialias: true,
              premultipliedAlpha: true,
              powerPreference: "high-performance",
            }}
          >
            <Scene
              colors={resolvedColors}
              colorsRef={colorsRef}
              seed={seed}
              agentState={agentState}
              volumeMode={volumeMode}
              manualInput={manualInput}
              manualOutput={manualOutput}
              inputVolumeRef={inputVolumeRef}
              outputVolumeRef={outputVolumeRef}
              getInputVolume={getInputVolume}
              getOutputVolume={getOutputVolume}
              isDarkMode={isDarkMode}
            />
          </Canvas>
        </div>
      </div>
    </div>
  )
}

function Scene({
  colors,
  colorsRef,
  seed,
  agentState,
  volumeMode,
  manualInput,
  manualOutput,
  inputVolumeRef,
  outputVolumeRef,
  getInputVolume,
  getOutputVolume,
  isDarkMode,
}: {
  colors: [string, string] | [string, string, string]
  colorsRef?: React.RefObject<[string, string] | [string, string, string]>
  seed?: number
  agentState: AgentState
  volumeMode: "auto" | "manual"
  manualInput?: number
  manualOutput?: number
  inputVolumeRef?: React.RefObject<number>
  outputVolumeRef?: React.RefObject<number>
  getInputVolume?: () => number
  getOutputVolume?: () => number
  isDarkMode: boolean
}) {
  const { gl } = useThree()
  const circleRef =
    useRef<THREE.Mesh<THREE.CircleGeometry, THREE.ShaderMaterial>>(null)
  const initialColorsRef = useRef<[string, string] | [string, string, string]>(colors)
  const isThreeColorRef = useRef(colors.length === 3)
  const targetColor1Ref = useRef(new THREE.Color(colors[0]))
  const targetColor2Ref = useRef(new THREE.Color(colors[1]))
  const targetColor3Ref = useRef(new THREE.Color(colors.length === 3 ? colors[2] : colors[1]))
  const animSpeedRef = useRef(0.1)
  const perlinNoiseTexture = useMemo(() => {
    const loader = new THREE.TextureLoader()
    const texture = loader.load(PERLIN_TEXTURE_PATH)
    return texture
  }, [])

  const agentRef = useRef<AgentState>(agentState)
  const modeRef = useRef<"auto" | "manual">(volumeMode)
  const manualInRef = useRef<number>(manualInput ?? 0)
  const manualOutRef = useRef<number>(manualOutput ?? 0)
  const curInRef = useRef(0)
  const curOutRef = useRef(0)

  useEffect(() => {
    agentRef.current = agentState
  }, [agentState])

  useEffect(() => {
    modeRef.current = volumeMode
  }, [volumeMode])

  useEffect(() => {
    manualInRef.current = clamp01(
      manualInput ?? inputVolumeRef?.current ?? getInputVolume?.() ?? 0
    )
  }, [manualInput, inputVolumeRef, getInputVolume])

  useEffect(() => {
    manualOutRef.current = clamp01(
      manualOutput ?? outputVolumeRef?.current ?? getOutputVolume?.() ?? 0
    )
  }, [manualOutput, outputVolumeRef, getOutputVolume])

  const random = useMemo(
    () => splitmix32(seed ?? Math.floor(Math.random() * 2 ** 32)),
    [seed]
  )
  const offsets = useMemo(
    () =>
      new Float32Array(Array.from({ length: 7 }, () => random() * Math.PI * 2)),
    [random]
  )

  useEffect(() => {
    isThreeColorRef.current = colors.length === 3
    targetColor1Ref.current = new THREE.Color(colors[0])
    targetColor2Ref.current = new THREE.Color(colors[1])
    if (colors.length === 3) {
      targetColor3Ref.current = new THREE.Color(colors[2])
    } else {
      targetColor3Ref.current = new THREE.Color(colors[1])
    }
    if (circleRef.current?.material) {
      circleRef.current.material.uniforms.uUseThreeColor.value = isThreeColorRef.current ? 1.0 : 0.0
    }
  }, [colors])

  useEffect(() => {
    if (colorsRef?.current?.length === 3) {
      isThreeColorRef.current = true
      targetColor1Ref.current = new THREE.Color(colorsRef.current[0])
      targetColor2Ref.current = new THREE.Color(colorsRef.current[1])
      targetColor3Ref.current = new THREE.Color(colorsRef.current[2])
    }
  }, [colorsRef])

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    const u = circleRef.current?.material?.uniforms
    if (!u) return

    u.uTime.value = t
    u.uOpacity.value = Math.min(1, u.uOpacity.value + delta * 1.5) // Faster fade-in to match reference glow

    const volumeMode = modeRef.current
    const manualInputVal = manualInRef.current
    const manualOutputVal = manualOutRef.current

    const inputVolume =
      volumeMode === "manual"
        ? clamp01(manualInputVal)
        : clamp01((inputVolumeRef?.current ?? getInputVolume?.() ?? 0) * 0.65)
    const outputVolume =
      volumeMode === "manual"
        ? clamp01(manualOutputVal)
        : clamp01((outputVolumeRef?.current ?? getOutputVolume?.() ?? 0) * 0.75)

    let targetIn = inputVolume
    let targetOut = outputVolume

    if (agentRef.current) {
      if (agentRef.current === null) {
        targetIn = 0
        targetOut = 0.3
      } else if (agentRef.current === "listening") {
        targetIn = clamp01(0.3 + Math.sin(t * 1.5) * 0.1)
        targetOut = 0.45
      } else if (agentRef.current === "talking") {
        targetIn = clamp01(0.55 + Math.sin(t * 4.0) * 0.2)
        targetOut = clamp01(0.6 + Math.sin(t * 3.0) * 0.2)
      } else {
        const base = 0.2 + 0.05 * Math.sin(t * 0.5)
        targetIn = clamp01(base)
        targetOut = clamp01(0.3)
      }
    }

    curInRef.current += (targetIn - curInRef.current) * 0.15
    curOutRef.current += (targetOut - curOutRef.current) * 0.15

    const targetSpeed = 0.05 + curInRef.current * 0.2
    animSpeedRef.current += (targetSpeed - animSpeedRef.current) * 0.1

    u.uAnimation.value += delta * animSpeedRef.current
    u.uInputVolume.value = curInRef.current
    u.uOutputVolume.value = curOutRef.current
    u.uColor1.value.lerp(targetColor1Ref.current, 0.08)
    u.uColor2.value.lerp(targetColor2Ref.current, 0.08)
    u.uColor3.value.lerp(targetColor3Ref.current, 0.08)
    u.uUseThreeColor.value = isThreeColorRef.current ? 1.0 : 0.0
  })

  useEffect(() => {
    const canvas = gl.domElement
    const onContextLost = (event: Event) => {
      event.preventDefault()
      setTimeout(() => {
        gl.forceContextRestore()
      }, 1)
    }
    canvas.addEventListener("webglcontextlost", onContextLost, false)
    return () =>
      canvas.removeEventListener("webglcontextlost", onContextLost, false)
  }, [gl])

  const uniforms = useMemo(() => {
    perlinNoiseTexture.wrapS = THREE.RepeatWrapping
    perlinNoiseTexture.wrapT = THREE.RepeatWrapping
    const isThreeColor = initialColorsRef.current.length === 3
    isThreeColorRef.current = isThreeColor
    return {
      uColor1: new THREE.Uniform(new THREE.Color(initialColorsRef.current[0])),
      uColor2: new THREE.Uniform(new THREE.Color(initialColorsRef.current[1])),
      uColor3: new THREE.Uniform(new THREE.Color(isThreeColor ? initialColorsRef.current[2] : initialColorsRef.current[1])),
      uUseThreeColor: new THREE.Uniform(isThreeColor ? 1.0 : 0.0),
      uOffsets: { value: offsets },
      uPerlinTexture: new THREE.Uniform(perlinNoiseTexture),
      uTime: new THREE.Uniform(0),
      uAnimation: new THREE.Uniform(0.1),
      uInverted: new THREE.Uniform(isDarkMode ? 1 : 0),
      uInputVolume: new THREE.Uniform(0),
      uOutputVolume: new THREE.Uniform(0),
      uOpacity: new THREE.Uniform(0),
    }
  }, [perlinNoiseTexture, offsets, isDarkMode])

  return (
    <mesh ref={circleRef}>
      <circleGeometry args={[3.5, 128]} />
      <shaderMaterial
        uniforms={uniforms}
        fragmentShader={fragmentShader}
        vertexShader={vertexShader}
        transparent={true}
      />
    </mesh>
  )
}

function splitmix32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x9e3779b9) | 0
    let t = a ^ (a >>> 16)
    t = Math.imul(t, 0x21f0aaad)
    t = t ^ (t >>> 15)
    t = Math.imul(t, 0x735a2d97)
    return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296
  }
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

const vertexShader = /* glsl */ `
uniform float uTime;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uAnimation;
uniform float uInverted;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uUseThreeColor;
uniform float uInputVolume;
uniform float uOutputVolume;
uniform float uOpacity;
uniform sampler2D uPerlinTexture;
varying vec2 vUv;

const float PI = 3.14159265358979323846;

// Create a metallic radial gradient with sharp ridges
float metallicFlow(vec2 uv, float time, float volume) {
    vec2 p = uv * 2.0 - 1.0;
    float len = length(p);
    float angle = atan(p.y, p.x);

    // Dynamic twisting based on perlin noise
    float noise = texture(uPerlinTexture, vec2(angle * 0.2, time * 0.1)).r;
    float twist = angle + noise * (2.0 + volume * 2.0);

    // Create the "fan blades" - 3 major lobes like the reference image
    // We add sine waves of different frequencies to create the folded metal look
    float v = sin(twist * 3.0 + time * 0.5);
    v += 0.5 * sin(twist * 6.0 + time * 0.3);
    
    // Sharpen the waves to look like metal ridges
    // Map from [-1.5, 1.5] to [0, 1]
    v = v * 0.5 + 0.5;
    
    // Apply contrast curve
    v = pow(v, 2.0); // Make darks darker
    
    // Add specular highlight sharpness
    float highlight = smoothstep(0.6, 1.0, v);
    
    return v + highlight * 0.5;
}

void main() {
    // Basic circular mask
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float alpha = 1.0 - smoothstep(0.95, 1.0, r);

    // Calculate the metallic gradient pattern
    float metal = metallicFlow(vUv, uTime, uInputVolume);
    
    // Color Mapping
    // The reference image has deep blacks, rich blues/cyans, and bright whites.
    // We map the calculated 'metal' value (0 to ~1.5) to colors.
    
    vec3 col = vec3(0.0);
    
    vec3 c1 = uColor1; // Deep Blue/Purple
    vec3 c2 = uColor2; // Cyan/Green
    vec3 c3 = uUseThreeColor > 0.5 ? uColor3 : uColor2; 
    
    // Dark Shadow (Black) -> Midtone (Color 1) -> Highlight (Color 2/3) -> Specular (White)
    
    if (metal < 0.4) {
        // Shadow area: Black to Color 1
        col = mix(vec3(0.0, 0.0, 0.0), c1, metal / 0.4);
    } else if (metal < 0.7) {
        // Midtone area: Color 1 to Color 2
        col = mix(c1, c2, (metal - 0.4) / 0.3);
    } else if (metal < 1.0) {
        // Highlight area: Color 2 to Color 3 (or boost)
        col = mix(c2, c3, (metal - 0.7) / 0.3);
    } else {
        // Specular area: Color 3 to White
        col = mix(c3, vec3(1.0), (metal - 1.0) * 2.0);
    }

    // Invert colors if dark mode is NOT active (assuming dark mode = black background)
    // The reference image is clearly on a dark background. 
    // If uInverted is 1 (Light Mode), we might want to invert the logic, 
    // but metallic shaders usually look best with additive light.
    // We will keep the contrast but maybe lighten the blacks slightly for light mode.
    if (uInverted > 0.5) {
       col = mix(col, vec3(1.0), 0.1); // Wash it out slightly for light mode
    }
    
    gl_FragColor = vec4(col, alpha * uOpacity);
}
`
