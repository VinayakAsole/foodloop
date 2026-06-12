/**
 * Returns color classes and labels corresponding to a trust score (0 - 100)
 * @param {number} score 
 * @returns {object} Object containing text color, background color, and badge label
 */
export const getTrustBadgeDetails = (score = 100) => {
  if (score >= 90) {
    return {
      textColor: 'text-secondary-500',
      bgColor: 'bg-secondary-500/10',
      borderColor: 'border-secondary-500/20',
      label: 'Highly Trusted',
      ratingText: 'Excellent'
    };
  } else if (score >= 75) {
    return {
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      label: 'Good Seller',
      ratingText: 'Good'
    };
  } else {
    return {
      textColor: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      label: 'Under Review',
      ratingText: 'Poor'
    };
  }
};

/**
 * Calculate seller's trust score out of 100 based on weighted metrics:
 * - Successful orders (40%): scales linearly up to 10 completed orders
 * - Average rating (30%): scales based on star rating out of 5
 * - Verified status (20%): 20 points if status is 'verified'
 * - Zero complaints (10%): 10 points if hasComplaints is false
 */
export const calculateTrustScore = (completedOrdersCount = 0, avgRating = 5, isVerified = false, hasComplaints = false) => {
  const orderPoints = Math.min((completedOrdersCount / 10) * 40, 40);
  const ratingPoints = (avgRating / 5) * 30;
  const verificationPoints = isVerified ? 20 : 0;
  const complaintPoints = hasComplaints ? 0 : 10;
  
  return Math.round(orderPoints + ratingPoints + verificationPoints + complaintPoints);
};
