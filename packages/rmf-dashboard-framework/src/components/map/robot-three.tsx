import robotoFont from '@fontsource/roboto/files/roboto-latin-400-normal.woff';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import React from 'react';
import { Euler, Vector3 } from 'three';

import { RobotData, RobotThreeMaker } from './robot-three-maker';
import { type RobotRippleEffectStyle } from './robot-ripple-effect';

const ROBOT_Z_POSITION = 5;
const CIRCLE_SEGMENT = 64;
const ROBOT_POSITION_SMOOTHING = 7;
const POSITION_EPSILON = 0.001;
const ROTATION_EPSILON = 0.001;

interface RobotThreeProps {
  robot: RobotData;
  robotLocation: [number, number, number];
  onRobotClick?: (ev: ThreeEvent<MouseEvent>, robot: RobotData) => void;
  robotLabel: boolean;
  rippleEffect?: RobotRippleEffectStyle;
}

export const RobotThree = ({
  robot,
  robotLocation,
  onRobotClick,
  robotLabel,
  rippleEffect,
}: RobotThreeProps) => {
  const robotId = `${robot.fleet}/${robot.name}`;
  const targetPosition = React.useMemo(
    () => new Vector3(robotLocation[0], robotLocation[1], ROBOT_Z_POSITION),
    [robotLocation],
  );
  const targetRotationZ = robotLocation[2] - Math.PI;
  const targetPoseRef = React.useRef({
    position: targetPosition.clone(),
    rotationZ: targetRotationZ,
  });
  const displayedPoseRef = React.useRef({
    position: targetPosition.clone(),
    rotationZ: targetRotationZ,
  });
  const [displayedPose, setDisplayedPose] = React.useState(() => ({
    position: targetPosition.clone(),
    rotationZ: targetRotationZ,
  }));

  React.useEffect(() => {
    targetPoseRef.current = {
      position: targetPosition.clone(),
      rotationZ: targetRotationZ,
    };
  }, [targetPosition, targetRotationZ]);

  useFrame((_state, delta) => {
    const currentPose = displayedPoseRef.current;
    const targetPose = targetPoseRef.current;
    const positionDistance = currentPose.position.distanceTo(targetPose.position);
    const rotationDelta = Math.atan2(
      Math.sin(targetPose.rotationZ - currentPose.rotationZ),
      Math.cos(targetPose.rotationZ - currentPose.rotationZ),
    );

    if (positionDistance < POSITION_EPSILON && Math.abs(rotationDelta) < ROTATION_EPSILON) {
      return;
    }

    const alpha = Math.min(1, 1 - Math.exp(-ROBOT_POSITION_SMOOTHING * delta));
    currentPose.position.lerp(targetPose.position, alpha);
    currentPose.rotationZ += rotationDelta * alpha;

    if (
      currentPose.position.distanceTo(targetPose.position) < POSITION_EPSILON &&
      Math.abs(
        Math.atan2(
          Math.sin(targetPose.rotationZ - currentPose.rotationZ),
          Math.cos(targetPose.rotationZ - currentPose.rotationZ),
        ),
      ) < ROTATION_EPSILON
    ) {
      currentPose.position.copy(targetPose.position);
      currentPose.rotationZ = targetPose.rotationZ;
    }

    setDisplayedPose({
      position: currentPose.position.clone(),
      rotationZ: currentPose.rotationZ,
    });
  });

  return (
    <React.Fragment key={robotId}>
      <RobotThreeMaker
        robot={robot}
        imageUrl={robot.iconPath}
        position={displayedPose.position}
        onRobotClick={onRobotClick}
        rotation={new Euler(0, 0, displayedPose.rotationZ)}
        circleSegment={CIRCLE_SEGMENT}
        fontPath={robotoFont}
        robotLabel={robotLabel}
        rippleEffect={rippleEffect}
      />
    </React.Fragment>
  );
};
