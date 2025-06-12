import { Animated, Dimensions } from 'react-native';
import { PostureFigure } from './types';
import { POSITIONS, TENSION } from './constants';

const { height } = Dimensions.get('window');

export const createFigureMovementAnimation = (
  figure: PostureFigure,
  onReachDesk: (figure: PostureFigure) => void
) => {
  // Target position should match defending figure position (bottom: 250 from screen bottom)
  const targetY = height - 250;
  const startX = figure.position.x._value;
  
  switch (figure.movementPattern.type) {
    case 'straight':
      // Tech Neck: Fast, straight movement
      return Animated.timing(figure.position, {
        toValue: { x: startX, y: targetY },
        duration: figure.speed,
        useNativeDriver: false,
      });
      
    case 'wobble':
      // Desk Hunch: Medium speed with wobble
      const wobbleAmount = figure.movementPattern.wobble || 15;
      return Animated.sequence([
        Animated.parallel([
          Animated.timing(figure.position.y, {
            toValue: targetY * 0.25,
            duration: figure.speed * 0.25,
            useNativeDriver: false,
          }),
          Animated.timing(figure.position.x, {
            toValue: startX + wobbleAmount,
            duration: figure.speed * 0.25,
            useNativeDriver: false,
          }),
        ]),
        Animated.parallel([
          Animated.timing(figure.position.y, {
            toValue: targetY * 0.5,
            duration: figure.speed * 0.25,
            useNativeDriver: false,
          }),
          Animated.timing(figure.position.x, {
            toValue: startX - wobbleAmount,
            duration: figure.speed * 0.25,
            useNativeDriver: false,
          }),
        ]),
        Animated.parallel([
          Animated.timing(figure.position.y, {
            toValue: targetY * 0.75,
            duration: figure.speed * 0.25,
            useNativeDriver: false,
          }),
          Animated.timing(figure.position.x, {
            toValue: startX + wobbleAmount * 0.5,
            duration: figure.speed * 0.25,
            useNativeDriver: false,
          }),
        ]),
        Animated.parallel([
          Animated.timing(figure.position.y, {
            toValue: targetY,
            duration: figure.speed * 0.25,
            useNativeDriver: false,
          }),
          Animated.timing(figure.position.x, {
            toValue: startX,
            duration: figure.speed * 0.25,
            useNativeDriver: false,
          }),
        ]),
      ]);
      
    case 'pause':
      // Slouch Slump: Slowest with pauses
      const pauseCount = figure.movementPattern.pauseCount || 2;
      const pauseDuration = figure.movementPattern.pauseDuration || 800;
      const segmentDuration = (figure.speed - pauseCount * pauseDuration) / (pauseCount + 1);
      const segmentDistance = targetY / (pauseCount + 1);
      
      const pauseSequence: Animated.CompositeAnimation[] = [];
      
      for (let i = 0; i <= pauseCount; i++) {
        // Movement segment
        pauseSequence.push(
          Animated.timing(figure.position.y, {
            toValue: segmentDistance * (i + 1),
            duration: segmentDuration,
            useNativeDriver: false,
          })
        );
        
        // Pause (except after the last segment)
        if (i < pauseCount) {
          pauseSequence.push(
            Animated.delay(pauseDuration)
          );
        }
      }
      
      return Animated.sequence(pauseSequence);
      
    case 'zigzag':
      // Lean Twist: Zigzag path
      const amplitude = figure.movementPattern.zigzagAmplitude || 30;
      const frequency = figure.movementPattern.zigzagFrequency || 3;
      const segmentCount = frequency * 2; // Each zigzag has 2 segments
      const ySegment = targetY / segmentCount;
      const timeSegment = figure.speed / segmentCount;
      
      const zigzagSequence: Animated.CompositeAnimation[] = [];
      
      for (let i = 0; i < segmentCount; i++) {
        const direction = i % 2 === 0 ? 1 : -1;
        const targetX = startX + (amplitude * direction);
        
        zigzagSequence.push(
          Animated.parallel([
            Animated.timing(figure.position.y, {
              toValue: ySegment * (i + 1),
              duration: timeSegment,
              useNativeDriver: false,
            }),
            Animated.timing(figure.position.x, {
              toValue: i === segmentCount - 1 ? startX : targetX, // End at center
              duration: timeSegment,
              useNativeDriver: false,
            }),
          ])
        );
      }
      
      return Animated.sequence(zigzagSequence);
      
    default:
      // Fallback to straight movement
      return Animated.timing(figure.position, {
        toValue: { x: startX, y: targetY },
        duration: figure.speed,
        useNativeDriver: false,
      });
  }
};

export const startFigureAnimation = (
  figure: PostureFigure,
  onReachDesk: (figure: PostureFigure) => void
) => {
  const animation = createFigureMovementAnimation(figure, onReachDesk);
  figure.animation = animation; // Store reference for pausing
  animation.start(() => onReachDesk(figure));
};

export const pauseFigureAnimation = (figure: PostureFigure) => {
  if (figure.animation) {
    figure.animation.stop();
  }
};

export const resumeFigureAnimation = (
  figure: PostureFigure,
  onReachDesk: (figure: PostureFigure) => void
) => {
  if (figure.isActive) {
    // Create new animation from current position
    const animation = createFigureMovementAnimation(figure, onReachDesk);
    figure.animation = animation;
    animation.start(() => onReachDesk(figure));
  }
};