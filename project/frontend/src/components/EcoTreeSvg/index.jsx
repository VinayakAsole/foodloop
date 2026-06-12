import React from 'react';

export const EcoTreeSvg = ({ stage = 'Seedling' }) => {
  // Define dimensions and viewBox
  const viewBox = "0 0 200 200";

  // Check stage name (normalize to match the ranks: 'Seedling', 'Sapling', 'Eco Champion', 'Forest Guardian')
  const normalizedStage = stage ? stage.trim() : 'Seedling';

  return (
    <div className="w-40 h-40 flex items-center justify-center relative select-none">
      {/* Self-contained CSS Animations */}
      <style>{`
        @keyframes seed-pulse {
          0%, 100% {
            transform: scale(1) translateY(0);
            filter: drop-shadow(0 0 4px rgba(52, 211, 153, 0.4));
          }
          50% {
            transform: scale(1.1) translateY(-2px);
            filter: drop-shadow(0 0 10px rgba(52, 211, 153, 0.8));
          }
        }
        @keyframes float-sparkle {
          0% {
            transform: translateY(0) scale(0);
            opacity: 0;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-40px) scale(1.2);
            opacity: 0;
          }
        }
        @keyframes wind-sway-sprout {
          0%, 100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(5deg);
          }
        }
        @keyframes wind-sway-champion {
          0%, 100% {
            transform: rotate(0deg);
          }
          33% {
            transform: rotate(2deg);
          }
          66% {
            transform: rotate(-2deg);
          }
        }
        @keyframes wind-sway-guardian {
          0%, 100% {
            transform: rotate(0deg) scale(1);
          }
          50% {
            transform: rotate(1.5deg) scale(1.01);
          }
        }
        @keyframes leaf-fall {
          0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.7;
          }
          90% {
            opacity: 0.7;
          }
          100% {
            transform: translate(-30px, 80px) rotate(180deg);
            opacity: 0;
          }
        }
        .animate-seed {
          transform-origin: 100px 145px;
          animation: seed-pulse 2.5s infinite ease-in-out;
        }
        .animate-sparkle-1 {
          animation: float-sparkle 3s infinite ease-in-out;
        }
        .animate-sparkle-2 {
          animation: float-sparkle 2.5s infinite ease-in-out 1s;
        }
        .animate-sparkle-3 {
          animation: float-sparkle 3.5s infinite ease-in-out 0.5s;
        }
        .animate-sway-sprout {
          transform-origin: 100px 150px;
          animation: wind-sway-sprout 4s infinite ease-in-out;
        }
        .animate-sway-champion {
          transform-origin: 100px 160px;
          animation: wind-sway-champion 6s infinite ease-in-out;
        }
        .animate-sway-guardian {
          transform-origin: 100px 170px;
          animation: wind-sway-guardian 8s infinite ease-in-out;
        }
        .animate-leaf-1 {
          transform-origin: 90px 70px;
          animation: leaf-fall 5s infinite linear;
        }
        .animate-leaf-2 {
          transform-origin: 120px 80px;
          animation: leaf-fall 6s infinite linear 2s;
        }
      `}</style>

      <svg
        viewBox={viewBox}
        className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background Gradient & Glows */}
        <defs>
          <radialGradient id="soil-glow" cx="50%" cy="80%" r="50%">
            <stop offset="0%" stopColor="rgba(46, 196, 182, 0.15)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </radialGradient>
          <linearGradient id="soil-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3d2c1e" />
            <stop offset="100%" stopColor="#1f140e" />
          </linearGradient>
          <linearGradient id="stem-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <linearGradient id="leaf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="trunk-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#78350F" />
            <stop offset="100%" stopColor="#451A03" />
          </linearGradient>
          <linearGradient id="guardian-leaf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6EE7B7" />
            <stop offset="50%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <linearGradient id="gold-leaf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="50%" stopColor="#EAB308" />
            <stop offset="100%" stopColor="#CA8A04" />
          </linearGradient>
        </defs>

        {/* Ambient light glow behind the tree */}
        <circle cx="100" cy="110" r="65" fill="url(#soil-glow)" />

        {/* Soil Mount (present in all stages) */}
        <path
          d="M 40,160 Q 100,140 160,160 L 165,175 Q 100,180 35,175 Z"
          fill="url(#soil-grad)"
          stroke="#4d3a2b"
          strokeWidth="1.5"
        />
        {/* Soil Accent detail */}
        <path d="M 60,155 Q 100,148 140,155" stroke="rgba(255,255,255,0.06)" fill="none" strokeWidth="1" />

        {/* ========================================== */}
        {/* STAGE 1: SEEDLING (Glowing Sprout Seed)    */}
        {/* ========================================== */}
        {normalizedStage === 'Seedling' && (
          <g>
            {/* Sparkles rising */}
            <circle cx="85" cy="120" r="2" fill="#34D399" className="animate-sparkle-1" />
            <circle cx="115" cy="110" r="1.5" fill="#6EE7B7" className="animate-sparkle-2" />
            <circle cx="100" cy="100" r="2.5" fill="#10B981" className="animate-sparkle-3" />

            {/* Glowing Seed */}
            <g className="animate-seed">
              <path
                d="M 100,130 C 92,142 92,152 100,155 C 108,152 108,142 100,130 Z"
                fill="#34D399"
                stroke="#6EE7B7"
                strokeWidth="1.5"
              />
              {/* Seed Inner Glow */}
              <circle cx="100" cy="147" r="3" fill="#A7F3D0" />
            </g>

            {/* Tiny Crack in the soil */}
            <path d="M 98,152 Q 100,154 102,152" stroke="#6EE7B7" fill="none" strokeWidth="1" />
          </g>
        )}

        {/* ========================================== */}
        {/* STAGE 2: SAPLING (Young Sprout swinging)   */}
        {/* ========================================== */}
        {normalizedStage === 'Sapling' && (
          <g className="animate-sway-sprout">
            {/* Sparkles */}
            <circle cx="75" cy="100" r="1.5" fill="#34D399" className="animate-sparkle-1" />
            <circle cx="120" cy="90" r="2" fill="#6EE7B7" className="animate-sparkle-2" />

            {/* Sprout Stem */}
            <path
              d="M 100,155 Q 98,120 105,95"
              fill="none"
              stroke="url(#stem-grad)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            
            {/* Left Leaf */}
            <path
              d="M 101,120 Q 82,105 85,120 Q 98,128 101,120 Z"
              fill="url(#leaf-grad)"
              stroke="#047857"
              strokeWidth="1"
            />
            {/* Right Leaf */}
            <path
              d="M 103,105 Q 120,90 120,105 Q 108,112 103,105 Z"
              fill="url(#leaf-grad)"
              stroke="#047857"
              strokeWidth="1"
            />

            {/* Top tiny growth leaf */}
            <path
              d="M 105,95 Q 102,85 106,82 Q 110,87 105,95 Z"
              fill="#A7F3D0"
              stroke="#10B981"
              strokeWidth="0.5"
            />
          </g>
        )}

        {/* ========================================== */}
        {/* STAGE 3: ECO CHAMPION (Neon Branched Tree)  */}
        {/* ========================================== */}
        {normalizedStage === 'Eco Champion' && (
          <g className="animate-sway-champion">
            {/* Sparkles */}
            <circle cx="65" cy="85" r="2" fill="#34D399" className="animate-sparkle-1" />
            <circle cx="135" cy="90" r="1.5" fill="#2EC4B6" className="animate-sparkle-2" />
            <circle cx="100" cy="65" r="2.5" fill="#FFBF69" className="animate-sparkle-3" />

            {/* Branching Trunk */}
            <path
              d="M 97,160 L 98,135 Q 96,110 85,95 C 80,88 74,86 70,88 Q 80,95 87,105 L 94,122 L 102,122 L 110,103 Q 118,92 128,84 C 132,82 126,88 120,95 Q 108,110 102,135 L 103,160 Z"
              fill="url(#trunk-grad)"
              stroke="#341a08"
              strokeWidth="1"
            />

            {/* Leaves Cluster Left */}
            <path d="M 70,88 Q 50,75 58,62 Q 72,66 70,88 Z" fill="url(#leaf-grad)" stroke="#047857" strokeWidth="0.8" />
            <path d="M 68,82 Q 52,95 58,102 Q 72,90 68,82 Z" fill="url(#leaf-grad)" stroke="#047857" strokeWidth="0.8" />

            {/* Leaves Cluster Right */}
            <path d="M 128,84 Q 148,70 142,58 Q 128,64 128,84 Z" fill="url(#leaf-grad)" stroke="#047857" strokeWidth="0.8" />
            <path d="M 126,90 Q 144,100 138,108 Q 122,96 126,90 Z" fill="url(#leaf-grad)" stroke="#047857" strokeWidth="0.8" />

            {/* Leaves Cluster Center */}
            <path d="M 95,95 Q 95,70 102,68 Q 110,75 98,95 Z" fill="#2EC4B6" stroke="#20a89c" strokeWidth="0.8" />
          </g>
        )}

        {/* ========================================== */}
        {/* STAGE 4: FOREST GUARDIAN (Glowing Oak)     */}
        {/* ========================================== */}
        {normalizedStage === 'Forest Guardian' && (
          <g className="animate-sway-guardian">
            {/* Falling Leaves Animations */}
            <circle cx="85" cy="80" r="2.5" fill="#FDE047" className="animate-leaf-1" />
            <circle cx="115" cy="85" r="2" fill="#6EE7B7" className="animate-leaf-2" />

            {/* Sparkles */}
            <circle cx="50" cy="70" r="2" fill="#34D399" className="animate-sparkle-1" />
            <circle cx="150" cy="80" r="1.5" fill="#6EE7B7" className="animate-sparkle-2" />
            <circle cx="100" cy="40" r="2.5" fill="#FDE047" className="animate-sparkle-3" />

            {/* Thick Ancient Trunk */}
            <path
              d="M 92,160 L 94,125 Q 92,95 80,80 C 72,70 60,65 52,68 Q 70,75 80,95 L 88,115 L 94,115 L 98,90 Q 100,55 90,45 C 98,52 102,65 102,90 L 105,115 L 112,98 Q 122,80 138,72 C 146,68 138,76 128,88 Q 116,102 108,125 L 108,160 Z"
              fill="url(#trunk-grad)"
              stroke="#291405"
              strokeWidth="1.2"
            />
            {/* Trunk Roots */}
            <path d="M 92,158 Q 80,165 72,168" stroke="url(#trunk-grad)" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 108,158 Q 120,165 128,168" stroke="url(#trunk-grad)" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 100,159 Q 100,168 102,172" stroke="url(#trunk-grad)" strokeWidth="2.5" fill="none" strokeLinecap="round" />

            {/* Canopy Groups (Layered Glowing Leaf Clouds) */}
            
            {/* Left Cloud */}
            <path
              d="M 45,85 C 30,80 25,60 40,50 C 35,35 55,25 65,35 C 75,25 90,35 85,50 C 95,65 80,85 65,80 C 55,90 45,90 45,85 Z"
              fill="url(#guardian-leaf-grad)"
              stroke="#047857"
              strokeWidth="1.2"
              opacity="0.95"
            />
            
            {/* Right Cloud */}
            <path
              d="M 125,90 C 110,85 115,65 125,55 C 120,40 140,30 150,42 C 162,35 175,45 170,60 C 178,75 162,95 145,90 C 135,98 125,95 125,90 Z"
              fill="url(#guardian-leaf-grad)"
              stroke="#047857"
              strokeWidth="1.2"
              opacity="0.95"
            />
            
            {/* Center Crown Cloud (Higher level - Golden hints) */}
            <path
              d="M 75,55 C 65,48 70,30 85,25 C 85,10 110,8 118,20 C 130,12 142,28 135,42 C 142,55 125,70 112,65 C 98,72 82,68 75,55 Z"
              fill="url(#gold-leaf-grad)"
              stroke="#B45309"
              strokeWidth="1.2"
              opacity="0.95"
            />
          </g>
        )}
      </svg>
    </div>
  );
};

export default EcoTreeSvg;
