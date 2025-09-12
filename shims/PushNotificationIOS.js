// Minimal no-op shim for React Native's deprecated PushNotificationIOS module.
// This avoids crashes when some code (directly or indirectly) requires
// 'react-native/Libraries/PushNotificationIOS/PushNotificationIOS' on iOS,
// where the underlying TurboModule may be unavailable (e.g., in Expo).
//
// Your app should use 'expo-notifications' instead. This shim ensures that
// any accidental/legacy usage does not throw.

/* eslint-disable @typescript-eslint/no-empty-function */

function noop() {}

function asyncNoop(value) {
  return Promise.resolve(value);
}

module.exports = {
  // Event API (no-op)
  addEventListener: noop,
  removeEventListener: noop,

  // Local notifications (no-op)
  presentLocalNotification: noop,
  scheduleLocalNotification: noop,
  cancelAllLocalNotifications: noop,
  cancelLocalNotifications: noop,

  // Delivered notifications (callbacks receive empty data)
  removeAllDeliveredNotifications: noop,
  removeDeliveredNotifications: noop,
  getDeliveredNotifications: (cb) => {
    if (typeof cb === 'function') cb([]);
  },

  // Scheduled notifications (callbacks receive empty data)
  getScheduledLocalNotifications: (cb) => {
    if (typeof cb === 'function') cb([]);
  },

  // Badge helpers (callbacks receive zero)
  setApplicationIconBadgeNumber: noop,
  getApplicationIconBadgeNumber: (cb) => {
    if (typeof cb === 'function') cb(0);
  },

  // Permissions (always resolve to disabled)
  requestPermissions: () => asyncNoop({ alert: false, badge: false, sound: false }),
  abandonPermissions: noop,
  checkPermissions: (cb) => {
    if (typeof cb === 'function') cb({ alert: false, badge: false, sound: false });
  },
  getAuthorizationStatus: (cb) => {
    if (typeof cb === 'function') cb(0);
  },

  // Initial notification (none)
  getInitialNotification: () => asyncNoop(null),

  // Constants
  FetchResult: {
    NewData: 'UIBackgroundFetchResultNewData',
    NoData: 'UIBackgroundFetchResultNoData',
    ResultFailed: 'UIBackgroundFetchResultFailed',
  },
};

