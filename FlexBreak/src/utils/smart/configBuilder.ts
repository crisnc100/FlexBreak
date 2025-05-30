import { BodyArea, Duration, IssueType, Position, SmartRoutineConfig, SmartRoutineInput } from '../../types';

export const generateRoutineConfig = (
  input: SmartRoutineInput,
  selectedIssue: IssueType,
  selectedDuration: Duration,
  transitionDuration?: number
): SmartRoutineConfig => {
  // Ensure we have at least one body area (default to Full Body)
  const areas: BodyArea[] = (input.parsedArea?.length ? input.parsedArea : ['Full Body']) as BodyArea[];

  // Determine preferred position
  let position: Position;
  if (input.parsedPosition) {
    position = input.parsedPosition;
  } else if (selectedIssue === 'pain') {
    position = Math.random() > 0.5 ? 'Sitting' : 'Lying';
  } else if (selectedIssue === 'stiffness') {
    position = Math.random() > 0.5 ? 'Standing' : 'Sitting';
  } else if (selectedIssue === 'tiredness') {
    position = 'Lying';
  } else {
    position = 'Standing';
  }

  const isDeskFriendly = !input.parsedActivity;

  return {
    areas,
    duration: selectedDuration,
    position,
    issueType: selectedIssue,
    isDeskFriendly,
    postActivity: input.parsedActivity,
    transitionDuration,
  };
}; 