export type ReminderFrequency = 'daily' | 'weekdays' | 'custom';

export interface ReminderSettings {
  enabled: boolean;
  time: string;
  days: string[];
  frequency: ReminderFrequency;
  message: string;
}

export interface NotificationSummary {
  total: number;
  motivational: number;
  reminders: number;  
  other: number;
  details: NotificationDetail[];
}

export interface NotificationDetail {
  type: string;
  title: string;
  scheduledFor: Date | null;
}