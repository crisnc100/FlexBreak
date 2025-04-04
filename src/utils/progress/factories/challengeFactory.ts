import { Challenge, CHALLENGE_STATUS } from '../types';
import * as dateUtils from '../modules/utils/dateUtils';

/**
 * Factory for creating new challenges with consistent defaults
 */
export const ChallengeFactory = {
  createFromTemplate(
    template: any, 
    category: string,
    options: { 
      uniqueIdSuffix?: string;
      forceStartDate?: Date;
    } = {}
  ): Challenge {
    const now = new Date();
    const uniqueId = `${template.id}_${dateUtils.today()}_${options.uniqueIdSuffix || Math.floor(Math.random() * 10000)}`;
    
    return {
      ...template,
      id: uniqueId,
      startDate: options.forceStartDate?.toISOString() || now.toISOString(),
      endDate: dateUtils.getEndDateForCategory(category),
      progress: 0,
      completed: false,
      claimed: false,
      category,
      status: CHALLENGE_STATUS.ACTIVE,
      lastUpdated: now.toISOString()
    };
  },
  
  createBatch(
    challengePool: any[],
    category: string,
    count: number,
    recentIds: string[] = []
  ): Challenge[] {
    let eligibleChallenges = challengePool.filter(c => !recentIds.includes(c.id));
    
    if (eligibleChallenges.length < count) {
      console.log(`Resetting ${category} challenge history due to insufficient unused challenges`);
      eligibleChallenges = challengePool;
    }
    
    const shuffled = [...eligibleChallenges].sort(() => 0.5 - Math.random());
    const selectedTemplates = shuffled.slice(0, count);
    
    return selectedTemplates.map(template => 
      ChallengeFactory.createFromTemplate(template, category)
    );
  }
};