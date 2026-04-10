'use client';

/**
 * FluidGlassButton
 *
 * Renders a self-contained R3F canvas that floats as a pointer-events-none
 * overlay EXACTLY over the wrapped children. The canvas is sized to the
 * wrapper's bounding rect so the glass mesh fills and distorts whatever is
 * beneath it (the button label, background, etc.).
 *
 * The "bar" geometry from ReactBits is ideal for pill / rounded-rect buttons.
 * We lock it to center, no pointer-follow, at a fixed scale that fills the
 * canvas, giving a smooth continuous transmission effect.
 */

import * as THREE from 'three';
import { useRef, memo } from 'react';
import {
  Canvas,
  createPortal,
  useFrame,
  useThree,
  ThreeElements,
} from '@react-three/fiber';
import {
  useFBO,
  useGLTF,
  MeshTransmissionMaterial,
} from '@react-three/drei';

// ─── Preload GLBs so there's no mid-render stall ───────────────────────────
useGLTF.preload('/assets/3d/bar.glb');
useGLTF.preload('/assets/3d/lens.glb');

// ─── Types ──────────────────────────────────────────────────────────────────
type MeshProps = ThreeElements['mesh'];

interface GlassMeshProps extends MeshProps {
  glb: string;
  geometryKey: string;
  ior?: number;
  thickness?: number;
  anisotropy?: number;
  chromaticAberration?: number;
  transmission?: number;
  roughness?: number;
  attenuationColor?: string;
  attenuationDistance?: number;
  color?: string;
  /** 0–1 fills the canvas width. default 0.82 */
  fillRatio?: number;
}

// ─── Inner THREE scene ───────────────────────────────────────────────────────
const GlassMesh = memo(function GlassMesh({
  glb,
  geometryKey,
  ior = 1.15,
  thickness = 8,
  anisotropy = 0.01,
  chromaticAberration = 0.06,
  transmission = 1,
  roughness = 0,
  color = '#ffffff',
  attenuationColor = '#ffffff',
  attenuationDistance = 0.5,
  fillRatio = 0.82,
  ...props
}: GlassMeshProps) {
  const ref = useRef<THREE.Mesh>(null!);
  const { nodes } = useGLTF(glb);
  const buffer = useFBO();
  const { viewport, camera } = useThree();

  // Empty background scene — we only care about refraction of what's behind
  const [bgScene] = useRef([new THREE.Scene()]).current;

  useFrame(({ gl }) => {
    const vp = viewport.getCurrentViewport(camera, [0, 0, 15]);

    // Scale the mesh to fill fillRatio of the canvas width
    const geo = (nodes[geometryKey] as THREE.Mesh)?.geometry;
    if (geo && ref.current) {
      geo.computeBoundingBox?.();
      const box = geo.boundingBox;
      if (box) {
        const geoW = box.max.x - box.min.x || 1;
        const targetScale = (vp.width * fillRatio) / geoW;
        ref.current.scale.setScalar(targetScale);
      }
    }

    // Keep centered
    ref.current.position.set(0, 0, 15);

    // Render background into FBO (empty scene → transparent)
    gl.setRenderTarget(buffer);
    gl.render(bgScene, camera);
    gl.setRenderTarget(null);
  });

  return (
    <>
      {createPortal(null, bgScene)}
      {/* Full-canvas background plane shows FBO (transparent so DOM shows through) */}
      <mesh scale={[viewport.width, viewport.height, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={buffer.texture} transparent opacity={0} />
      </mesh>
      <mesh
        ref={ref}
        rotation-x={Math.PI / 2}
        geometry={(nodes[geometryKey] as THREE.Mesh)?.geometry}
        {...props}
      >
        <MeshTransmissionMaterial
          buffer={buffer.texture}
          ior={ior}
          thickness={thickness}
          anisotropy={anisotropy}
          chromaticAberration={chromaticAberration}
          transmission={transmission}
          roughness={roughness}
          color={color}
          attenuationColor={attenuationColor}
          attenuationDistance={attenuationDistance}
          backside={false}
          samples={4}
          resolution={512}
        />
      </mesh>
    </>
  );
});

// ─── Public API ─────────────────────────────────────────────────────────────
export type FluidGlassVariant = 'bar' | 'lens';

export interface FluidGlassButtonProps {
  children: React.ReactNode;
  /** Which GLB shape to overlay. 'bar' suits pill buttons, 'lens' for circular. */
  variant?: FluidGlassVariant;
  className?: string;
  href?: string;
  onClick?: () => void;
  /** Passes straight to the underlying button/anchor element */
  [key: string]: unknown;
}

/**
 * Wrap any button content with a liquid-glass WebGL overlay.
 *
 * Usage:
 *   <FluidGlassButton href="#" variant="bar" className="h-[46px] w-[145px] rounded-full">
 *     Get started
 *   </FluidGlassButton>
 */
export function FluidGlassButton({
  children,
  variant = 'bar',
  className = '',
  href,
  onClick,
  ...rest
}: FluidGlassButtonProps) {
  const isBar = variant === 'bar';
  const glb = isBar ? '/assets/3d/bar.glb' : '/assets/3d/lens.glb';
  const geometryKey = isBar ? 'Cube' : 'Cylinder';

  const Wrapper = href ? 'a' : 'button';

  return (
    <Wrapper
      href={href as string}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center overflow-hidden cursor-pointer select-none ${className}`}
      {...rest}
    >
      {/* DOM content (the label, bg colour, border etc.) */}
      <span className="relative z-10 pointer-events-none">{children}</span>

      {/* WebGL overlay — fills parent via absolute inset */}
      <span
        aria-hidden
        className="absolute inset-0 z-20 pointer-events-none"
        style={{ mixBlendMode: 'normal' }}
      >
        <Canvas
          camera={{ position: [0, 0, 20], fov: 15 }}
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
          }}
          style={{ width: '100%', height: '100%' }}
          dpr={[1, 2]}
        >
          <GlassMesh
            glb={glb}
            geometryKey={geometryKey}
            ior={1.18}
            thickness={isBar ? 10 : 5}
            anisotropy={0.02}
            chromaticAberration={0.06}
            transmission={1}
            roughness={0}
            color="#ffffff"
            attenuationColor="#ffffff"
            attenuationDistance={0.3}
            fillRatio={isBar ? 0.9 : 0.75}
          />
        </Canvas>
      </span>
    </Wrapper>
  );
}
