import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Test if notifications work when app is closed
 * This is the definitive test for background notifications
 */
export async function testBackgroundNotifications() {
  console.log('\n🧪 BACKGROUND NOTIFICATION TEST\n');
  console.log('Platform:', Platform.OS);
  console.log('Time now:', new Date().toLocaleTimeString());
  
  // First, check permissions
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    console.log('❌ Notifications not granted!');
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    if (newStatus !== 'granted') {
      console.log('❌ Permission denied');
      return;
    }
  }
  console.log('✅ Notification permissions granted');
  
  // Cancel any existing test notifications
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const testNotifs = all.filter(n => n.content.data?.isBackgroundTest === true);
  for (const notif of testNotifs) {
    await Notifications.cancelScheduledNotificationAsync(notif.identifier);
  }
  console.log(`Cancelled ${testNotifs.length} existing test notifications`);
  
  // Schedule test notifications
  const tests = [
    { seconds: 10, name: '10 second test' },
    { seconds: 30, name: '30 second test' },
    { seconds: 60, name: '1 minute test' },
    { seconds: 120, name: '2 minute test' },
    { seconds: 300, name: '5 minute test' }
  ];
  
  const scheduledIds = [];
  
  for (const test of tests) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰ ${test.name}`,
          body: `This fired ${test.seconds}s after scheduling`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            isBackgroundTest: true,
            scheduledAt: new Date().toISOString(),
            testName: test.name
          }
        },
        trigger: {
          seconds: test.seconds,
          repeats: false
        }
      });
      
      scheduledIds.push({ id, ...test });
      console.log(`✅ Scheduled: ${test.name} (ID: ${id})`);
    } catch (error) {
      console.log(`❌ Failed to schedule ${test.name}:`, error);
    }
  }
  
  // Verify they were scheduled
  const afterSchedule = await Notifications.getAllScheduledNotificationsAsync();
  const ourTests = afterSchedule.filter(n => 
    scheduledIds.some(s => s.id === n.identifier)
  );
  
  console.log(`\n✅ Successfully scheduled ${ourTests.length}/${tests.length} notifications`);
  
  // Show what to expect
  console.log('\n📋 TEST INSTRUCTIONS:');
  console.log('1. You should see notifications at:');
  tests.forEach(test => {
    const fireTime = new Date();
    fireTime.setSeconds(fireTime.getSeconds() + test.seconds);
    console.log(`   - ${test.name}: ${fireTime.toLocaleTimeString()}`);
  });
  console.log('\n2. After 30s notification, CLOSE THE APP COMPLETELY');
  console.log('3. The 1min, 2min, and 5min notifications should still appear!');
  console.log('\nIf they don\'t appear when app is closed:');
  console.log('- Check battery optimization settings');
  console.log('- Check Do Not Disturb settings');
  console.log('- On some devices, you need to add app to "Protected Apps"');
  
  return scheduledIds;
}

/**
 * Check which test notifications have fired
 */
export async function checkTestStatus() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const tests = all.filter(n => n.content.data?.isBackgroundTest === true);
  
  console.log('\n📊 TEST STATUS:');
  if (tests.length === 0) {
    console.log('No test notifications remaining (all have fired or were cancelled)');
  } else {
    console.log(`${tests.length} test notifications still scheduled:`);
    tests.forEach(n => {
      console.log(`- ${n.content.title}`);
    });
  }
}

/**
 * Cancel all test notifications
 */
export async function cancelAllTests() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const tests = all.filter(n => n.content.data?.isBackgroundTest === true);
  
  for (const notif of tests) {
    await Notifications.cancelScheduledNotificationAsync(notif.identifier);
  }
  
  console.log(`Cancelled ${tests.length} test notifications`);
}