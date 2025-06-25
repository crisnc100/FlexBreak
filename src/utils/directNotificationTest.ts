import * as Notifications from 'expo-notifications';

/**
 * Direct notification test - bypasses all handlers
 */
export async function directNotificationTest() {
  console.log('\n🔧 DIRECT NOTIFICATION TEST\n');
  
  // Temporarily set a permissive handler
  const originalHandler = Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  
  try {
    // Test 1: Immediate notification
    console.log('Test 1: Immediate notification...');
    await Notifications.presentNotificationAsync({
      title: '📱 Immediate Test',
      body: 'This should appear right now!',
    });
    
    // Test 2: Delayed notification with seconds
    console.log('\nTest 2: 5-second delay...');
    const id1 = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ 5 Second Test',
        body: 'This should appear 5 seconds after scheduling',
        sound: true,
      },
      trigger: {
        seconds: 5,
      },
    });
    console.log(`Scheduled with ID: ${id1}`);
    
    // Test 3: Date-based notification (30 seconds)
    console.log('\nTest 3: Date-based (30s from now)...');
    const futureDate = new Date();
    futureDate.setSeconds(futureDate.getSeconds() + 30);
    
    const id2 = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📅 Date Test',
        body: `Scheduled for ${futureDate.toLocaleTimeString()}`,
        sound: true,
      },
      trigger: {
        date: futureDate,
      },
    });
    console.log(`Scheduled with ID: ${id2}`);
    
    // Check what's scheduled
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    const all = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`\n📊 Total scheduled: ${all.length}`);
    
    const ourNotifs = all.filter(n => 
      n.identifier === id1 || n.identifier === id2
    );
    console.log(`Our notifications found: ${ourNotifs.length}`);
    
    if (ourNotifs.length === 0) {
      console.log('\n❌ PROBLEM: Notifications are not persisting!');
      console.log('Possible causes:');
      console.log('1. Notification handler is cancelling them');
      console.log('2. iOS issue with seconds-based triggers');
      console.log('3. Permission or configuration issue');
    } else {
      console.log('\n✅ Notifications are scheduled properly');
      ourNotifs.forEach(n => {
        const trigger = n.trigger as any;
        console.log(`- ${n.content.title}: ${JSON.stringify(trigger)}`);
      });
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

/**
 * Test only date-based triggers (like motivational messages)
 */
export async function testDateBasedNotifications() {
  console.log('\n📅 TESTING DATE-BASED NOTIFICATIONS\n');
  
  const times = [
    { minutes: 1, name: '1 minute' },
    { minutes: 2, name: '2 minutes' },
    { minutes: 5, name: '5 minutes' }
  ];
  
  const scheduled = [];
  
  for (const time of times) {
    const triggerDate = new Date();
    triggerDate.setMinutes(triggerDate.getMinutes() + time.minutes);
    
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `📅 ${time.name} test`,
          body: `Using date trigger like motivational messages`,
          sound: true,
          data: { testType: 'date-based' }
        },
        trigger: {
          date: triggerDate,
          type: Notifications.SchedulableTriggerInputTypes.DATE
        }
      });
      
      scheduled.push({ id, ...time, triggerDate });
      console.log(`✅ Scheduled ${time.name} at ${triggerDate.toLocaleTimeString()}`);
    } catch (error) {
      console.log(`❌ Failed ${time.name}:`, error);
    }
  }
  
  // Verify
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const found = all.filter(n => scheduled.some(s => s.id === n.identifier));
  
  console.log(`\n📊 Scheduled ${scheduled.length}, found ${found.length}`);
  
  if (found.length === scheduled.length) {
    console.log('✅ Date-based notifications work properly!');
  } else {
    console.log('❌ Some date-based notifications missing');
  }
  
  return scheduled;
}