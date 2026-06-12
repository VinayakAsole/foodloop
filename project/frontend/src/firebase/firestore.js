import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  runTransaction 
} from 'firebase/firestore';
import { db } from './config';
import { calculateTrustScore } from '../utils/trustScore';
import { updateLiveCounter, deleteChatRoom } from './rtdb';

// ==========================================
// FOOD LISTINGS QUERIES
// ==========================================

// Helper to recursively remove undefined/NaN values to prevent Firestore write crashes
const deepSanitize = (data) => {
  if (data === undefined) return null;
  if (data === null) return null;
  if (typeof data !== 'object') {
    if (typeof data === 'number' && isNaN(data)) {
      return null;
    }
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(deepSanitize);
  }
  const sanitized = {};
  Object.entries(data).forEach(([k, v]) => {
    sanitized[k] = deepSanitize(v);
  });
  return sanitized;
};

export const addFoodListing = async (foodData) => {
  // Deep sanitize to handle nested objects (like location: { latitude, longitude })
  const sanitized = deepSanitize(foodData);

  const docRef = await addDoc(collection(db, 'foods'), {
    ...sanitized,
    remainingQuantity: sanitized.quantity,
    status: 'available',
    createdAt: new Date().toISOString()
  });

  // Sync to RTDB — wrapped so it can NEVER kill the post
  try {
    await updateLiveCounter(docRef.id, sanitized.quantity);
  } catch (rtdbErr) {
    console.warn('RTDB live counter sync skipped (non-critical):', rtdbErr?.message || rtdbErr);
  }

  return { id: docRef.id, ...sanitized };
};


export const getAvailableFoods = async () => {
  const querySnapshot = await getDocs(
    query(collection(db, 'foods'), where('status', '==', 'available'))
  );
  const now = new Date();
  const list = [];
  const updatePromises = [];

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const isExpired = new Date(data.expiryTime) <= now;
    const isSoldOut = (data.remainingQuantity ?? 0) <= 0;

    if (isExpired || isSoldOut) {
      const statusUpdate = isSoldOut ? 'sold_out' : 'expired';
      const foodRef = doc(db, 'foods', docSnap.id);
      updatePromises.push(updateDoc(foodRef, { status: statusUpdate }));
      try {
        updatePromises.push(updateLiveCounter(docSnap.id, 0));
      } catch (rtdbErr) {
        console.warn(`RTDB live counter sync skipped (non-critical) during auto-archive for ${docSnap.id}:`, rtdbErr);
      }
    } else {
      list.push({ id: docSnap.id, ...data });
    }
  });

  if (updatePromises.length > 0) {
    try {
      await Promise.all(updatePromises);
    } catch (err) {
      console.warn("Failed to complete some auto-archive updates:", err);
    }
  }

  return list;
};

export const getSellerFoods = async (sellerId) => {
  const querySnapshot = await getDocs(
    query(collection(db, 'foods'), where('sellerId', '==', sellerId))
  );
  const now = new Date();
  const list = [];
  const updatePromises = [];

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const isExpired = data.status === 'available' && new Date(data.expiryTime) <= now;
    const isSoldOut = data.status === 'available' && (data.remainingQuantity ?? 0) <= 0;

    if (isExpired || isSoldOut) {
      const statusUpdate = isSoldOut ? 'sold_out' : 'expired';
      const foodRef = doc(db, 'foods', docSnap.id);
      updatePromises.push(updateDoc(foodRef, { status: statusUpdate }));
      try {
        updatePromises.push(updateLiveCounter(docSnap.id, 0));
      } catch (rtdbErr) {
        console.warn(`RTDB live counter sync skipped (non-critical) during auto-archive for ${docSnap.id}:`, rtdbErr);
      }
      list.push({ id: docSnap.id, ...data, status: statusUpdate, remainingQuantity: 0 });
    } else {
      list.push({ id: docSnap.id, ...data });
    }
  });

  if (updatePromises.length > 0) {
    try {
      await Promise.all(updatePromises);
    } catch (err) {
      console.warn("Failed to complete some seller auto-archive updates:", err);
    }
  }

  return list;
};

export const deleteFoodListing = async (foodId) => {
  const foodRef = doc(db, 'foods', foodId);
  await updateDoc(foodRef, { status: 'deleted' });
  try {
    await updateLiveCounter(foodId, 0);
  } catch (rtdbErr) {
    console.warn("RTDB sync failed during listing deletion:", rtdbErr);
  }
};

export const toggleDonation = async (foodId, isDonation) => {
  const foodRef = doc(db, 'foods', foodId);
  await updateDoc(foodRef, { 
    isDonation, 
    price: isDonation ? 0 : 30
  });
};


export const updateKitchenStatus = async (uid, status) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { kitchenStatus: status });
  await updateDoc(doc(db, 'sellers', uid), { kitchenStatus: status }).catch(() => {});
};

// ==========================================
// ORDERS QUERIES
// ==========================================

export const createOrder = async (orderData) => {
  const { foodId, quantity } = orderData;
  const foodRef = doc(db, 'foods', foodId);
  const orderRef = doc(collection(db, 'orders'));
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  await runTransaction(db, async (transaction) => {
    const foodDoc = await transaction.get(foodRef);
    if (!foodDoc.exists()) throw new Error("Food item does not exist!");

    const currentQty = foodDoc.data().remainingQuantity;
    if (currentQty < quantity) throw new Error("Item was sold out just now!");

    const newQty = currentQty - quantity;
    const updatePayload = { remainingQuantity: newQty };
    if (newQty === 0) {
      updatePayload.status = 'sold_out';
    }

    transaction.update(foodRef, updatePayload);
    transaction.set(orderRef, {
      ...orderData,
      status: 'placed',
      otpCode,
      createdAt: new Date().toISOString()
    });
  });

  // Update live counter in RTDB
  try {
    const foodDoc = await getDoc(foodRef);
    if (foodDoc.exists()) {
      const remainingQuantity = foodDoc.data().remainingQuantity;
      await updateLiveCounter(foodId, remainingQuantity);
    }
  } catch (rtdbErr) {
    console.warn("RTDB live counter sync failed after order:", rtdbErr);
  }

  return { id: orderRef.id, otpCode };
};

export const getBuyerOrders = async (buyerId) => {
  const querySnapshot = await getDocs(
    query(collection(db, 'orders'), where('buyerId', '==', buyerId))
  );
  const list = [];
  querySnapshot.forEach((doc) => {
    list.push({ id: doc.id, ...doc.data() });
  });
  return list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const getSellerOrders = async (sellerId) => {
  const querySnapshot = await getDocs(
    query(collection(db, 'orders'), where('sellerId', '==', sellerId))
  );
  const list = [];
  querySnapshot.forEach((doc) => {
    list.push({ id: doc.id, ...doc.data() });
  });
  return list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const updateOrderStatus = async (orderId, status) => {
  const orderRef = doc(db, 'orders', orderId);
  const orderDoc = await getDoc(orderRef);
  if (orderDoc.exists()) {
    const orderData = orderDoc.data();
    const oldStatus = orderData.status;
    
    await updateDoc(orderRef, { status });

    if (status === 'cancelled' && oldStatus !== 'cancelled') {
      const foodRef = doc(db, 'foods', orderData.foodId);
      const foodDoc = await getDoc(foodRef);
      if (foodDoc.exists()) {
        const foodData = foodDoc.data();
        const newQty = foodData.remainingQuantity + orderData.quantity;
        const updatePayload = { remainingQuantity: newQty };
        if (foodData.status === 'sold_out') {
          updatePayload.status = 'available';
        }
        await updateDoc(foodRef, updatePayload);
        
        // Sync to RTDB
        try {
          await updateLiveCounter(orderData.foodId, newQty);
        } catch (rtdbErr) {
          console.warn("RTDB sync failed during order cancellation:", rtdbErr);
        }
      }
      await deleteChatRoom(orderId);
    }

    if (status === 'completed' && oldStatus !== 'completed') {
      await recalculateSellerEarnings(orderData.sellerId);
      await deleteChatRoom(orderId);
    }
  }
};

export const verifyOrderPickup = async (orderId, sellerId, enteredOtp) => {
  const orderRef = doc(db, 'orders', orderId);
  const orderDoc = await getDoc(orderRef);
  if (!orderDoc.exists()) throw new Error("Order not found");

  const order = orderDoc.data();
  if (order.otpCode !== enteredOtp) {
    throw new Error("Invalid verification code");
  }

  await updateDoc(orderRef, { status: 'completed' });
  await recalculateSellerEarnings(sellerId);
  await deleteChatRoom(orderId);
  return { id: orderId, ...order, status: 'completed' };
};

// ==========================================
// REVIEWS & RATINGS QUERIES
// ==========================================

export const addReview = async (reviewData) => {
  const { sellerId } = reviewData;

  await addDoc(collection(db, 'reviews'), {
    ...reviewData,
    createdAt: new Date().toISOString()
  });

  const querySnapshot = await getDocs(
    query(collection(db, 'reviews'), where('sellerId', '==', sellerId))
  );
  let totalStars = 0;
  let count = 0;
  querySnapshot.forEach((doc) => {
    totalStars += doc.data().rating;
    count++;
  });

  if (count > 0) {
    const avgRating = totalStars / count;
    
    const ordersSnapshot = await getDocs(
      query(collection(db, 'orders'), where('sellerId', '==', sellerId), where('status', '==', 'completed'))
    );
    const completedCount = ordersSnapshot.size;
    
    const sellerDoc = await getDoc(doc(db, 'users', sellerId));
    const sellerData = sellerDoc.exists() ? sellerDoc.data() : null;
    const isVerified = sellerData?.status === 'verified';
    
    const score = calculateTrustScore(completedCount, avgRating, isVerified, false);
    
    const userRef = doc(db, 'users', sellerId);
    await updateDoc(userRef, { trustScore: score });
    await updateDoc(doc(db, 'sellers', sellerId), { trustScore: score }).catch(() => {});
  }
};

export const getCategoryAveragePrice = async (category) => {
  try {
    const foods = await getAvailableFoods();
    const categoryFoods = foods.filter(f => f.category === category && !f.isDonation && f.price > 0);
    if (categoryFoods.length === 0) return null;
    const sum = categoryFoods.reduce((acc, f) => acc + f.price, 0);
    return Math.round(sum / categoryFoods.length);
  } catch (err) {
    console.warn("Failed to calculate average category price:", err);
    return null;
  }
};

export const recalculateSellerEarnings = async (sellerId) => {
  try {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'orders'),
        where('sellerId', '==', sellerId),
        where('status', '==', 'completed')
      )
    );
    
    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    let weekly = 0;
    let monthly = 0;
    let yearly = 0;
    let total = 0;
    
    querySnapshot.forEach((docSnap) => {
      const order = docSnap.data();
      const price = parseFloat(order.totalPrice) || 0;
      const orderDate = new Date(order.createdAt || order.completedAt || now);
      const diffDays = (now - orderDate) / oneDayMs;
      
      total += price;
      if (diffDays <= 7) {
        weekly += price;
      }
      if (diffDays <= 30) {
        monthly += price;
      }
      if (diffDays <= 365) {
        yearly += price;
      }
    });
    
    const financials = { weekly, monthly, yearly, total, lastUpdated: new Date().toISOString() };
    const userRef = doc(db, 'users', sellerId);
    await updateDoc(userRef, { financials });
    await updateDoc(doc(db, 'sellers', sellerId), { financials }).catch(() => {});
    
    return financials;
  } catch (err) {
    console.error("Failed to recalculate seller earnings:", err);
    return null;
  }
};

export const getGlobalCompletedPlatesCount = async () => {
  try {
    const querySnapshot = await getDocs(
      query(collection(db, 'orders'), where('status', '==', 'completed'))
    );
    let count = 0;
    querySnapshot.forEach((docSnap) => {
      count += (docSnap.data().quantity || 0);
    });
    return count;
  } catch (err) {
    console.error("Failed to get global completed plates count:", err);
    return 0;
  }
};


