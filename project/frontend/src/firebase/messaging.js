import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from './config';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './config';

let messaging = null;
try {
  if (typeof window !== 'undefined') {
    messaging = getMessaging(app);
  }
} catch (e) {
  console.warn("FCM is not supported in this environment/browser:", e.message);
}

/**
 * Request permission for Push Notifications
 */
export const requestNotificationPermission = async (userId = null) => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn("Notifications are not supported by this browser.");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      
      if (messaging) {
        // Retrieve token
        const token = await getToken(messaging, {
          vapidKey: 'YOUR_MESSAGING_VAPID_KEY_HERE' // Replace with your Firebase Web Push VAPID key
        });
        
        // Save token to Firestore user document if userId is provided
        if (userId && token) {
          try {
            await updateDoc(doc(db, 'users', userId), { fcmToken: token });
          } catch (dbErr) {
            console.warn("Could not save FCM token to Firestore:", dbErr);
          }
        }
        
        return token;
      }
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
  }
  return null;
};

/**
 * Handle incoming foreground notifications
 * @param {function} callback 
 */
export const onMessageListener = (callback) => {
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};

/**
 * Utility to simulate a push notification locally
 * (Great for Viva demonstrations!)
 */
export const simulateLocalNotification = (title, body, type = 'info') => {
  // 1. Dispatch custom event for in-app alert toasts
  const event = new CustomEvent('mock-notification', {
    detail: {
      notification: { title, body },
      data: { type }
    }
  });
  window.dispatchEvent(event);

  // 2. Append to local notification logs for in-app feeds
  try {
    const cached = JSON.parse(localStorage.getItem('foodloop_notification_logs') || '[]');
    const newLog = {
      id: Date.now(),
      title,
      body,
      timestamp: new Date().toLocaleTimeString(),
      type
    };
    const updated = [newLog, ...cached].slice(0, 15); // Limit to 15 logs
    localStorage.setItem('foodloop_notification_logs', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('notification-logged'));
  } catch (err) {
    console.warn("Failed to log notification locally:", err);
  }

  // 3. Standard Web Browser Notification
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.svg'
      });
    } catch (e) {
      console.warn("Failed to trigger browser notification constructor: ", e);
    }
  }
};
