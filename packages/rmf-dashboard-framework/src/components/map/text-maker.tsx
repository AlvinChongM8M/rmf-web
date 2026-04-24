import { Html } from '@react-three/drei';
import { useTheme } from '@mui/material';
import React from 'react';

interface TextThreeRenderingProps {
  position: [number, number, number];
  text?: string;
  color?: string;
  fontSize?: string;
}

export const TextThreeRendering = ({
  position,
  text,
  color,
  fontSize = '0.6rem',
}: TextThreeRenderingProps): JSX.Element => {
  const theme = useTheme();
  const bgColor = color ?? theme.palette.background.paper;
  const textColor = theme.palette.text.primary;
  const HEIGHT = 8;
  const ELEVATION = 0;
  const positionZ = HEIGHT / 2 + ELEVATION;
  const [isHovered, setIsHovered] = React.useState(false);

  const handlePointerOver = () => {
    setIsHovered(true);
  };

  const handlePointerOut = () => {
    setIsHovered(false);
  };

  const scaleFactor = isHovered ? 2 : 1.0;
  return (
    <>
      <mesh position={position}>
        <mesh position={[0, 0, positionZ]}>
          {text && (
            <Html zIndexRange={[0, 0, 1]}>
              {text && (
                <div
                  style={{
                    backgroundColor: bgColor,
                    color: textColor,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: fontSize,
                    transform: `scale(${scaleFactor})`,
                    transition: 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  }}
                  onPointerOver={handlePointerOver}
                  onPointerOut={handlePointerOut}
                >
                  {text}
                </div>
              )}
            </Html>
          )}
        </mesh>
      </mesh>
    </>
  );
};
