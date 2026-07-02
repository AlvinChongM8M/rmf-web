import { useFrame } from '@react-three/fiber';
import React from 'react';
import { DoubleSide, Mesh, MeshBasicMaterial, Vector3 } from 'three';

export interface RobotRippleEffectStyle {
  enabled?: boolean;
  color?: string;
  radius?: number;
  ringWidth?: number;
  ringCount?: number;
  minScale?: number;
  maxScale?: number;
  opacity?: number;
  duration?: number;
  zOffset?: number;
}

interface RobotRippleEffectProps {
  position: Vector3;
  robotColor: string;
  outlineColor?: string;
  style?: RobotRippleEffectStyle;
}

export function RobotRippleEffect({
  position,
  robotColor,
  outlineColor,
  style,
}: RobotRippleEffectProps): JSX.Element | null {
  const ringRefs = React.useRef<Array<Mesh | null>>([]);
  const radius = style?.radius ?? 0.78;
  const ringWidth = style?.ringWidth ?? 0.055;
  const ringCount = Math.max(1, Math.min(4, Math.trunc(style?.ringCount ?? 3)));
  const minScale = style?.minScale ?? 1;
  const maxScale = style?.maxScale ?? 2.35;
  const opacity = style?.opacity ?? 0.85;
  const duration = Math.max(0.8, style?.duration ?? 3.2);
  const color = style?.color ?? outlineColor ?? robotColor;
  const zOffset = style?.zOffset ?? 0.08;

  const rings = React.useMemo(
    () => Array.from({ length: ringCount }, (_value, index) => index),
    [ringCount],
  );

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();

    ringRefs.current.forEach((ring, index) => {
      if (!ring) {
        return;
      }

      const phase = (elapsed / duration + index / ringCount) % 1;
      const scale = minScale + (maxScale - minScale) * phase;
      const material = ring.material as MeshBasicMaterial;

      ring.scale.setScalar(scale);
      material.opacity = opacity * Math.pow(1 - phase, 1.5);
    });
  });

  if (style?.enabled === false) {
    return null;
  }

  return (
    <group position={[position.x, position.y, position.z + zOffset]} raycast={() => undefined}>
      {rings.map((ringIndex) => (
        <mesh
          key={ringIndex}
          ref={(mesh) => {
            ringRefs.current[ringIndex] = mesh;
          }}
          raycast={() => undefined}
        >
          <ringGeometry args={[radius, radius + ringWidth, 96]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={opacity}
            depthWrite={false}
            side={DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
