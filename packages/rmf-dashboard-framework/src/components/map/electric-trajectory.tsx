import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import React from 'react';
import { Vector3 } from 'three';

import { TrajectoryData } from '../../services';

export interface ElectricTrajectoryStyle {
  variant?: 'electric' | 'line';
  animated?: boolean;
  glowColor?: string;
  coreColor?: string;
  pulseColor?: string;
  conflictGlowColor?: string;
  conflictCoreColor?: string;
  conflictPulseColor?: string;
  glowLineWidth?: number;
  coreLineWidth?: number;
  pulseLineWidth?: number;
  glowOpacity?: number;
  coreOpacity?: number;
  pulseOpacity?: number;
  dashSize?: number;
  gapSize?: number;
  flowSpeed?: number;
  elevation?: number;
}

interface ElectricTrajectoryProps {
  trajectoryData: TrajectoryData;
  style?: ElectricTrajectoryStyle;
}

type AnimatedLine = React.ElementRef<typeof Line>;
type AnimatedLineMaterial = { dashOffset?: number };

export function ElectricTrajectory({
  trajectoryData,
  style,
}: ElectricTrajectoryProps): JSX.Element | null {
  const pulseRef = React.useRef<AnimatedLine | null>(null);

  const elevation = style?.elevation ?? 4;
  const isConflict = Boolean(trajectoryData.conflict);
  const variant = style?.variant ?? 'electric';
  const glowColor =
    (isConflict ? style?.conflictGlowColor : style?.glowColor) ??
    (isConflict ? '#b91c1c' : '#0284c7');
  const coreColor =
    (isConflict ? style?.conflictCoreColor : style?.coreColor) ??
    (isConflict ? '#7f1d1d' : '#0f172a');
  const pulseColor =
    (isConflict ? style?.conflictPulseColor : style?.pulseColor) ??
    (isConflict ? '#ef4444' : '#2563eb');

  const points = React.useMemo(
    () =>
      trajectoryData.trajectory.segments.map(
        (segment) => new Vector3(segment.x[0], segment.x[1], elevation),
      ),
    [trajectoryData.trajectory.segments, elevation],
  );

  useFrame(({ clock }) => {
    if (style?.animated === false || variant !== 'electric') {
      return;
    }

    const elapsed = clock.getElapsedTime();
    const flowSpeed = style?.flowSpeed ?? 1.2;

    const pulseMaterial = pulseRef.current?.material as AnimatedLineMaterial | undefined;

    if (pulseMaterial) {
      pulseMaterial.dashOffset = -elapsed * flowSpeed;
    }
  });

  if (points.length < 2) {
    return null;
  }

  if (variant === 'line') {
    return (
      <Line
        points={points}
        color={pulseColor}
        linewidth={style?.coreLineWidth ?? 5}
      />
    );
  }

  return (
    <>
      <Line
        points={points}
        color={glowColor}
        linewidth={style?.glowLineWidth ?? 9}
        transparent
        opacity={style?.glowOpacity ?? 0.42}
        depthWrite={false}
      />
      <Line
        points={points}
        color={coreColor}
        linewidth={style?.coreLineWidth ?? 2.5}
        transparent
        opacity={style?.coreOpacity ?? 0.9}
        depthWrite={false}
      />
      <Line
        ref={pulseRef}
        points={points}
        color={pulseColor}
        linewidth={style?.pulseLineWidth ?? 4}
        dashed
        dashSize={style?.dashSize ?? 0.8}
        gapSize={style?.gapSize ?? 1.8}
        transparent
        opacity={style?.pulseOpacity ?? 0.9}
        depthWrite={false}
      />
    </>
  );
}
