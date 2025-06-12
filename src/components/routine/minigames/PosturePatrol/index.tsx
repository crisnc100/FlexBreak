import React from 'react';
import { GameController } from './GameController';

interface PosturePatrolProps {
  onGameComplete: (score: number, xp: number) => void;
  onSkip: () => void;
  context?: string;
}

const PosturePatrol: React.FC<PosturePatrolProps> = ({
  onGameComplete,
  onSkip,
  context = 'routine'
}) => {
  return (
    <GameController
      onGameComplete={onGameComplete}
      onSkip={onSkip}
      context={context}
    />
  );
};

export { PosturePatrol };
export default PosturePatrol;