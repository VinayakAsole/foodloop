
/**
 * Premium custom logo icon matching the double-loop design from screenshots/landing_page_screenshot.png
 */
export const LogoIcon = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Orange Loop (Left) representing food sharing / bowl */}
    <path
      d="M 38 52 C 22 52, 20 32, 32 22 C 44 12, 54 29, 47 45"
      stroke="#FF6B35"
      strokeWidth="6.5"
      strokeLinecap="round"
      fill="none"
    />
    {/* Blue/Teal Loop (Right) representing coordination / utensils */}
    <path
      d="M 50 38 C 43 52, 53 70, 66 70 C 79 70, 78 48, 63 42"
      stroke="#2EC4B6"
      strokeWidth="6.5"
      strokeLinecap="round"
      fill="none"
    />
    {/* Small bowl icon inside left loop */}
    <path
      d="M 23 27 H 35 C 35 33, 23 33, 23 27 Z"
      fill="#FF6B35"
    />
    <path
      d="M 26 23 V 25 M 29 23 V 25 M 32 23 V 25"
      stroke="#FF6B35"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* Fork inside right loop */}
    <path
      d="M 64 53 V 61 M 62 53 V 56 M 66 53 V 56"
      stroke="#2EC4B6"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* Spoon inside right loop */}
    <path
      d="M 72 58 V 61"
      stroke="#2EC4B6"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M 72 52 C 70.5 52, 70.5 56, 72 56 C 73.5 56, 73.5 52, 72 52 Z"
      fill="#2EC4B6"
    />
  </svg>
);

/**
 * Reusable brand text styled correctly as Food (Orange) and Loop (Teal)
 */
export const LogoText = ({ className = "text-xl", showAi = true }) => (
  <span className={`${className} font-extrabold tracking-tight font-display`}>
    <span className="text-[#FF6B35]">Food</span>
    <span className="text-[#2EC4B6]">Loop</span>
    {showAi && (
      <span className="text-white text-[10px] font-bold ml-1.5 px-1.5 py-0.5 bg-[#FF6B35]/10 rounded-full border border-[#FF6B35]/20">
        AI
      </span>
    )}
  </span>
);

export const Logo = ({ className = "flex items-center gap-2", iconSize = "w-8 h-8", textSize = "text-xl", showAi = true }) => (
  <div className={className}>
    <LogoIcon className={iconSize} />
    <LogoText className={textSize} showAi={showAi} />
  </div>
);

export default Logo;
