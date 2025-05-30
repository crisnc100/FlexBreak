/**
 * Shared types for Firebase functionality
 */

export type ReminderFrequency = 'daily' | 'weekdays' | 'custom';

export type ReminderSettings = {
  enabled: boolean;
  time: string;
  days: string[];
  frequency: ReminderFrequency;
  message: string;
};

export type NotificationSummary = {
  total: number;
  scheduled: Array<{
    identifier: string;
    content: {
      title?: string;
      body?: string;
      data?: any;
    };
    trigger: any;
  }>;
};

export type MotivationalMessage = {
  title: string;
  body: string;
  data?: {
    type: string;
    message?: string;
  };
};