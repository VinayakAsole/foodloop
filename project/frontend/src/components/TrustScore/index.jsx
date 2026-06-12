import React from 'react';
import { Award, ShieldCheck, AlertCircle } from 'lucide-react';
import { getTrustBadgeDetails } from '../../utils/trustScore';

export const TrustScore = ({ score = 100, showIcon = true, className = '' }) => {
  const { textColor, bgColor, borderColor, label, ratingText } = getTrustBadgeDetails(score);

  return (
    <div className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full border ${bgColor} ${borderColor} ${textColor} ${className}`}>
      {showIcon && (
        score >= 90 ? (
          <ShieldCheck size={14} className="animate-pulse" />
        ) : score >= 75 ? (
          <Award size={14} />
        ) : (
          <AlertCircle size={14} />
        )
      )}
      <span className="text-xs font-semibold tracking-wide uppercase">
        Trust Score: {score}% ({ratingText})
      </span>
    </div>
  );
};

export default TrustScore;
