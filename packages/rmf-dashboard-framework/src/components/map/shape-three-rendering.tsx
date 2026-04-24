import { Circle, Html } from '@react-three/drei';
import { useTheme } from '@mui/material';
import React from 'react';

interface ShapeThreeRenderingProps {
  position: [number, number, number];
  color: string;
  text?: string;
  circleShape: boolean;
  size?: number;
  labelColor?: string;
  labelFontSize?: string;
}

export const debounce = (callback: () => void, delay: number): (() => void) => {
  let timeoutId: number | null = null;

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(() => {
      callback();
    }, delay);
  };
};

export const ShapeThreeRendering = ({
  position,
  color,
  text,
  circleShape,
  size = 0.3,
  labelColor,
  labelFontSize = '0.6rem',
}: ShapeThreeRenderingProps): JSX.Element => {
  const theme = useTheme();
  const bgColor = labelColor ?? theme.palette.background.paper;
  const textColor = theme.palette.text.primary;
  const HEIGHT = 8;
  const ELEVATION = 0;
  const positionZ = HEIGHT / 2 + ELEVATION;
  const [isHovered, setIsHovered] = React.useState(false);

  const debouncedHandlePointerOver = debounce(() => {
    setIsHovered(true);
  }, 300);

  const debouncedHandlePointerOut = debounce(() => {
    setIsHovered(false);
  }, 300);

  const scaleFactor = isHovered ? 2 : 1.0;

  return (
    <>
      {circleShape ? (
        <Circle args={[size, 64]} position={[position[0], position[1], positionZ]}>
          <meshBasicMaterial color={color} />
        </Circle>
      ) : (
        <group position={position}>
          <mesh
            position={[0, 0, positionZ]}
            scale={[0.5, 0.5, 0.5]}
            onPointerOver={debouncedHandlePointerOver}
            onPointerOut={debouncedHandlePointerOut}
          >
            {isHovered && (
              <Html zIndexRange={[1]}>
                <div
                  style={{
                    backgroundColor: bgColor,
                    color: textColor,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: labelFontSize,
                    transform: `scale(${scaleFactor})`,
                    transition: 'transform 0.3s',
                  }}
                >
                  {text}
                </div>
              </Html>
            )}
            <boxGeometry args={[size * 4, size * 4, size * 4]} />
            <meshStandardMaterial color={color} opacity={0.6} transparent />
          </mesh>
        </group>
      )}
    </>
  );
};
