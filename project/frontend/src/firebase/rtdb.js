import { ref as rtdbRef, onValue, set as rtdbSet, push as rtdbPush, remove as rtdbRemove } from 'firebase/database';
import { rtdb } from './config';

/**
 * Sync active food remaining counts
 * @param {string} foodId 
 * @param {function} callback - callback triggered with remaining quantity
 */
export const syncLiveCounter = (foodId, callback) => {
  const dbRef = rtdbRef(rtdb, `inventory/${foodId}`);
  const unsubscribe = onValue(dbRef, (snapshot) => {
    const value = snapshot.val();
    if (value !== null) {
      callback(value);
    }
  });

  return unsubscribe;
};

/**
 * Update the inventory counter in RTDB
 */
export const updateLiveCounter = async (foodId, quantity) => {
  const dbRef = rtdbRef(rtdb, `inventory/${foodId}`);
  await rtdbSet(dbRef, quantity);
};

/**
 * Send a chat message for a specific order
 */
export const sendChatMessage = async (orderId, messageText, senderId, senderName) => {
  const messagesRef = rtdbRef(rtdb, `chats/${orderId}/messages`);
  const newMsgRef = rtdbPush(messagesRef);
  await rtdbSet(newMsgRef, {
    text: messageText.trim(),
    senderId,
    senderName,
    timestamp: Date.now()
  });
};

/**
 * Subscribe to messages in a chat room for an order
 * @param {string} orderId 
 * @param {function} callback - callback triggered with the sorted list of messages
 */
export const subscribeToChat = (orderId, callback) => {
  const messagesRef = rtdbRef(rtdb, `chats/${orderId}/messages`);
  const unsubscribe = onValue(messagesRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const list = Object.entries(data).map(([key, val]) => ({
        id: key,
        ...val
      })).sort((a, b) => a.timestamp - b.timestamp);
      callback(list);
    } else {
      callback([]);
    }
  });

  return unsubscribe;
};

/**
 * Destroy the chat room path in RTDB (protect user privacy)
 */
export const deleteChatRoom = async (orderId) => {
  try {
    const chatRef = rtdbRef(rtdb, `chats/${orderId}`);
    await rtdbRemove(chatRef);
  } catch (err) {
    console.warn(`Failed to delete chat room ${orderId} (non-critical):`, err);
  }
};

