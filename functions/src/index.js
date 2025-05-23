/**
 * FlexBreak Firebase Functions
 * 
 * This file exports all Firebase functions used by the FlexBreak app
 */

const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Collection of motivational messages for stretching/breaks
const MOTIVATIONAL_MESSAGES = [
  {
    title: "Time for a quick stretch!",
    body: "Take a 5-minute break to reset your focus and energy."
  },
  {
    title: "Movement break!",
    body: "Stand up and stretch your arms above your head for better circulation."
  },
  {
    title: "Posture check!",
    body: "Take a moment to relax your shoulders and sit up straight."
  },
  {
    title: "Break reminder",
    body: "A 2-minute stretch now can prevent hours of discomfort later."
  },
  {
    title: "Wellness check",
    body: "Remember to stay hydrated and take short breaks throughout your day."
  },
  {
    title: "Quick break time",
    body: "Roll your shoulders and stretch your neck to relieve tension."
  },
  {
    title: "Movement matters",
    body: "Regular movement breaks help improve productivity and focus."
  },
  {
    title: "FlexBreak reminder",
    body: "Take a moment to breathe deeply and stretch your body."
  }
];

/**
 * Cloud function that sends a random motivational message to all users
 * Triggered by a scheduled event (Cloud Scheduler)
 */
exports.sendMotivationalMessage = functions.scheduler.onSchedule(
  {
    schedule: 'every day 09:00',
    timeZone: 'America/New_York',
  },
  async (event) => {
    try {
      // Select a random message
      const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
      const message = MOTIVATIONAL_MESSAGES[randomIndex];
      
      // Create the notification
      const notification = {
        notification: {
          title: message.title,
          body: message.body,
        },
        data: {
          type: 'motivational',
          timestamp: Date.now().toString(),
        },
        android: {
          notification: {
            channelId: 'motivational_messages',
            priority: 'high',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
        topic: 'all_users', // Send to all subscribed users
      };
      
      // Send the message
      const response = await admin.messaging().send(notification);
      console.log('Successfully sent message:', response);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
);

/**
 * Cloud function to send a welcome notification when a user enables notifications
 * Triggered when a user's FCM token is stored in the database
 */
exports.sendWelcomeNotification = functions.firestore.onDocumentCreated(
  {
    document: 'fcm_tokens/{tokenId}',
    region: 'us-central1',
  },
  async (event) => {
    try {
      const snapshot = event.data;
      if (!snapshot) {
        console.log('No document data');
        return;
      }
      
      const tokenData = snapshot.data();
      const token = tokenData?.token;
      
      if (!token) {
        console.error('No token found in the document');
        return;
      }
      
      // Create welcome notification
      const message = {
        notification: {
          title: 'Welcome to FlexBreak!',
          body: 'You\'ll now receive helpful reminders to take stretch breaks throughout your day.',
        },
        data: {
          type: 'welcome',
          timestamp: Date.now().toString(),
        },
        token: token,
      };
      
      // Send the message
      const response = await admin.messaging().send(message);
      console.log('Successfully sent welcome message:', response);
    } catch (error) {
      console.error('Error sending welcome message:', error);
    }
  }
);

/**
 * HTTP endpoint to manually send a custom notification to all users
 * Used for testing or special announcements
 */
exports.sendCustomNotification = functions.https.onCall({
  cors: true, 
  region: 'us-central1',
  maxInstances: 10
}, async (request) => {
  try {
    const data = request.data;
    const title = data.title;
    const body = data.body;
    const customData = data.data;
    const token = data.token; // Optional: For sending to a specific device
    
    // Validate input
    if (!title || !body) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Notification must include both title and body'
      );
    }
    
    // Create the notification
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        type: 'custom',
        timestamp: Date.now().toString(),
        ...(customData || {}),
      },
    };
    
    // Send to specific device if token provided, otherwise to all users
    if (token) {
      message.token = token;
    } else {
      message.topic = 'all_users';
    }
    
    // Send the message
    const response = await admin.messaging().send(message);
    console.log('Successfully sent custom message:', response);
    
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Error sending custom notification:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Cloud function to send personal reminders to users based on their preferences
 * Runs every minute to check if any reminders should be sent
 * Premium feature that works when app is closed
 */
exports.sendPersonalReminders = functions.scheduler.onSchedule(
  {
    schedule: 'every 1 minutes',
    region: 'us-central1',
  },
  async (event) => {
    try {
      console.log('Running personal reminders check');
      
      // Get current time
      const now = new Date();
      const currentHour = now.getUTCHours();
      const currentMinute = now.getUTCMinutes();
      const currentDay = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
      
      // Convert to local day names for matching with app format
      const dayMap = {
        0: 'sun',
        1: 'mon',
        2: 'tue',
        3: 'wed',
        4: 'thu', 
        5: 'fri',
        6: 'sat'
      };
      
      // Get all users with reminder settings
      const snapshot = await admin.firestore().collection('user_reminders')
        .where('enabled', '==', true)
        .get();
      
      if (snapshot.empty) {
        console.log('No active reminders found');
        return;
      }
      
      console.log(`Found ${snapshot.size} active reminder settings`);
      let remindersSent = 0;
      
      // Loop through all user reminders
      for (const doc of snapshot.docs) {
        const reminderData = doc.data();
        const { 
          userId, 
          token, 
          time, 
          frequency, 
          days, 
          message, 
          timeZoneOffset = 0,
          isPremium = false,
          premiumLevel = 0
        } = reminderData;
        
        // Skip if missing essential data
        if (!token || !time) {
          console.log('Skipping reminder due to missing data:', reminderData.userId);
          continue;
        }
        
        // Parse reminder time (stored as "HH:MM" in UTC)
        const [reminderHour, reminderMinute] = time.split(':').map(num => parseInt(num, 10));
        
        // Adjust for user's timezone (stored as minutes offset from UTC)
        const userHour = (currentHour + Math.floor(timeZoneOffset / 60)) % 24;
        const userMinute = (currentMinute + (timeZoneOffset % 60)) % 60;
        
        // Calculate user's local day (accounting for timezone offset)
        let userDay = currentDay;
        if (userHour < 0) {
          userDay = (userDay - 1 + 7) % 7; // Adjust day if time goes to previous day
        } else if (userHour >= 24) {
          userDay = (userDay + 1) % 7; // Adjust day if time goes to next day
        }
        
        const userDayName = dayMap[userDay];
        
        // Check if this reminder should be sent now
        const shouldSendReminder = 
          reminderHour === userHour && 
          reminderMinute === userMinute && 
          (
            frequency === 'daily' || 
            (frequency === 'weekdays' && userDay >= 1 && userDay <= 5) ||
            (frequency === 'custom' && days && days.includes(userDayName))
          );
        
        if (shouldSendReminder) {
          console.log(`Sending reminder to user ${userId}`);
          
          // Build the notification
          const notification = {
            notification: {
              title: 'FlexBreak Reminder',
              body: message || 'Time for your scheduled stretch break!',
            },
            data: {
              type: 'personal_reminder',
              timestamp: Date.now().toString(),
              userId: userId || '',
              isPremium: String(isPremium),
              premiumLevel: String(premiumLevel)
            },
            android: {
              notification: {
                channelId: 'personal_reminders',
                priority: 'high',
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: 'default',
                },
              },
            },
            token: token,
          };
          
          // Send the message
          await admin.messaging().send(notification);
          remindersSent++;
        }
      }
      
      console.log(`Successfully sent ${remindersSent} personal reminders`);
    } catch (error) {
      console.error('Error sending personal reminders:', error);
    }
  }
);

/**
 * Cloud function to save or update user reminder settings
 * Called from the app when a user configures their reminders
 */
exports.saveUserReminders = functions.https.onCall({
  cors: true,
  region: 'us-central1',
  maxInstances: 10
}, async (request) => {
  try {
    const data = request.data;
    
    // Extract and validate fields
    const token = data.token;
    const enabled = data.enabled === undefined ? true : data.enabled;
    const time = data.time;
    const frequency = data.frequency || 'daily';
    const days = data.days || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const message = data.message;
    const timeZoneOffset = data.timeZoneOffset;
    const isPremium = data.isPremium === undefined ? false : data.isPremium;
    const premiumLevel = data.premiumLevel || 0;
    
    // Validate input
    if (!token) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'FCM token is required'
      );
    }
    
    if (!time) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Reminder time is required'
      );
    }
    
    // Generate a user ID from the token if not provided
    const userId = token.substring(0, 28);
    
    // Save to Firestore
    await admin.firestore().collection('user_reminders')
      .doc(userId)
      .set({
        userId,
        token,
        enabled,
        time,
        frequency,
        days,
        message,
        timeZoneOffset,
        isPremium,
        premiumLevel,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    
    // Also save the token for welcome notifications
    if (enabled) {
      await admin.firestore().collection('fcm_tokens')
        .doc(token)
        .set({
          token,
          userId,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error saving user reminders:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
}); 