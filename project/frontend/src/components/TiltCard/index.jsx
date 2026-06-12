import React, { useRef, useState, useEffect } from 'react';

export const TiltCard = ({ children, className = '', ...props }) => {
  const cardRef = useRef(null);
  const [transformStyle, setTransformStyle] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect touchscreens to bypass tilt calculations for performance
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(pointer: coarse)').matches);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseMove = (e) => {
    if (isMobile || !cardRef.current) return;
    
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Rotate limits (max 8 degrees for clean subtle physics)
    const rotateX = ((centerY - y) / centerY) * 8;
    const rotateY = ((x - centerX) / centerX) * 8;
    
    setTransformStyle(`perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    setTransformStyle('perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transformStyle,
        transition: transformStyle ? 'none' : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
        transformStyle: 'preserve-3d'
      }}
      className={`transition-all duration-300 ${className}`}
      {...props}
    >
      <div style={{ transform: isMobile ? 'none' : 'translateZ(15px)', transformStyle: 'preserve-3d' }} className="h-full w-full">
        {children}
      </div>
    </div>
  );
};

export default TiltCard;
