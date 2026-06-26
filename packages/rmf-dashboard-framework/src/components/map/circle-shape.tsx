import { Circle, Line } from '@react-three/drei';
import { MeshProps, ThreeEvent } from '@react-three/fiber';
import { Euler, Vector3 } from 'three';

import { RobotData } from './robot-three-maker';

interface CircleShapeProps extends MeshProps {
  position: Vector3;
  rotation: Euler;
  onRobotClick?: (ev: ThreeEvent<MouseEvent>) => void;
  robot: RobotData;
  segment: number;
}

export const CircleShape = ({
  position,
  rotation,
  onRobotClick,
  robot,
  segment,
  onPointerOver,
  onPointerOut,
}: CircleShapeProps): JSX.Element => {
  const SCALED_RADIUS = 0.7;

  const rotatedX = position.x + SCALED_RADIUS * Math.cos(rotation.z);
  const rotatedY = position.y + SCALED_RADIUS * Math.sin(rotation.z);
  const outlinePoints = Array.from({ length: segment + 1 }, (_value, index) => {
    const angle = (index / segment) * Math.PI * 2;
    return new Vector3(
      position.x + SCALED_RADIUS * Math.cos(angle),
      position.y + SCALED_RADIUS * Math.sin(angle),
      position.z + 0.01,
    );
  });

  return (
    <>
      <Circle
        args={[SCALED_RADIUS, segment]}
        position={position}
        rotation={rotation}
        onClick={onRobotClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <meshBasicMaterial color={robot.color} />
      </Circle>
      {robot.outlineColor && (
        <Line points={outlinePoints} color={robot.outlineColor} linewidth={3} />
      )}
      <Line
        points={[position.x, position.y, position.z, rotatedX, rotatedY, position.z]}
        color={robot.outlineColor ?? 'black'}
        linewidth={2}
      />
    </>
  );
};
