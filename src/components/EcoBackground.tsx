import React from 'react';
import { ScreenType, UserRole } from '../types';

interface EcoBackgroundProps {
  currentScreen?: ScreenType;
  activeRole?: UserRole;
  authScreen?: 'welcome' | 'login' | 'register' | 'authenticated';
}

export const EcoBackground: React.FC<EcoBackgroundProps> = ({
  currentScreen = 'dashboard',
  activeRole = 'user',
  authScreen = 'authenticated',
}) => {
  // Screen-based intensity tuning: keep background light & non-distracting
  const isAuth = authScreen !== 'authenticated';
  const isScanOrDashboard = currentScreen === 'dashboard' || currentScreen === 'scan';
  const isMinimal = currentScreen === 'facilities' || currentScreen === 'guide';

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden select-none bg-[#F5F8F4]"
    >
      {/* 
        ==================================================
        LAYER 1: BACKGROUND (Off-White Base & Soft Sage Transition)
        ==================================================
      */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#F5F8F4] via-[#F1F6F2] to-[#E9F3EC] opacity-95" />

      {/* Extremely faint topographic / natural contour lines for elegant subtle depth */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.035] text-[#174D35]"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern
            id="eco-contour-grid"
            width="120"
            height="120"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 0,40 Q 30,10 60,40 T 120,40 M 0,80 Q 40,110 80,80 T 120,80"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#eco-contour-grid)" />
      </svg>

      {/* 
        ==================================================
        LAYER 2: MIDGROUND (Large Blurred Organic Mint & Sage Forms)
        ==================================================
      */}

      {/* Form 1: Top-Right Soft Sage & Mint Organic Cloud */}
      <div
        className={`absolute -top-[12%] -right-[15%] w-[480px] h-[480px] sm:w-[650px] sm:h-[650px] rounded-full mix-blend-multiply filter blur-[95px] transition-opacity duration-1000 animate-eco-float-1 ${
          isMinimal ? 'opacity-35' : 'opacity-65'
        }`}
        style={{
          background: 'radial-gradient(circle, #DCEBE1 0%, #CDEBDD 55%, rgba(220, 235, 225, 0) 80%)',
        }}
      />

      {/* Form 2: Mid-Left Flowing Soft Mint Blob */}
      <div
        className={`absolute top-[28%] -left-[18%] w-[440px] h-[440px] sm:w-[580px] sm:h-[580px] rounded-full mix-blend-multiply filter blur-[90px] transition-opacity duration-1000 animate-eco-float-2 ${
          isMinimal ? 'opacity-30' : 'opacity-60'
        }`}
        style={{
          background: 'radial-gradient(circle, #CDEBDD 0%, #DCEBE1 60%, rgba(67, 185, 120, 0.12) 85%)',
        }}
      />

      {/* Form 3: Bottom Center Natural Forest Hint (Low contrast depth) */}
      <div
        className="absolute bottom-[-8%] left-[20%] w-[500px] h-[420px] sm:w-[700px] sm:h-[500px] rounded-full mix-blend-multiply filter blur-[110px] opacity-40 animate-eco-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(23, 77, 53, 0.14) 0%, rgba(220, 235, 225, 0.4) 50%, transparent 75%)',
        }}
      />

      {/* 
        ==================================================
        LAYER 3: FOREGROUND (Subtle Green Curves & Ambient Radial Glows)
        ==================================================
      */}

      {/* Top Header Light-to-Green Radial Glow Aura */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl h-[260px] opacity-50 pointer-events-none filter blur-[60px]"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(67, 185, 120, 0.18) 0%, rgba(205, 235, 221, 0.25) 45%, transparent 75%)',
        }}
      />

      {/* Translucent Curved Organic Waves & Floating Floral Petal Vectors */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-50"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="eco-wave-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#16A765" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#E9F8EF" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0B5138" stopOpacity="0.05" />
          </linearGradient>

          <linearGradient id="eco-wave-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#063B2A" stopOpacity="0.08" />
            <stop offset="70%" stopColor="#45C96B" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#F4FBF6" stopOpacity="0" />
          </linearGradient>

          {/* Floral Petal Definition */}
          <g id="eco-petal-shape">
            <path
              d="M0,0 C15,-20 35,-15 35,0 C35,15 15,30 0,35 C-15,30 -35,15 -35,0 C-35,-15 -15,-20 0,0 Z"
              fill="#16A765"
              fillOpacity="0.18"
            />
          </g>
        </defs>

        {/* Dynamic organic leaf-inspired curve 1 */}
        <path
          d="M -100,200 C 300,50 600,400 1100,180 C 1300,90 1500,250 1600,300 L 1600,-100 L -100,-100 Z"
          fill="url(#eco-wave-grad-1)"
        />

        {/* Dynamic organic leaf-inspired curve 2 */}
        <path
          d="M -50,650 C 350,850 750,550 1200,750 C 1350,820 1500,700 1600,680 L 1600,1000 L -50,1000 Z"
          fill="url(#eco-wave-grad-2)"
        />

        {/* Floating Floral Petals Accents */}
        <use href="#eco-petal-shape" x="150" y="120" transform="scale(0.8) rotate(25)" />
        <use href="#eco-petal-shape" x="1250" y="180" transform="scale(0.9) rotate(-40)" />
        <use href="#eco-petal-shape" x="90" y="680" transform="scale(0.7) rotate(60)" />
        <use href="#eco-petal-shape" x="1320" y="720" transform="scale(1.1) rotate(-15)" />

        {/* Ultra-faint organic line accents */}
        <path
          d="M 50,150 Q 400,320 850,190 T 1450,280"
          fill="none"
          stroke="#16A765"
          strokeWidth="1.2"
          strokeOpacity="0.14"
          strokeDasharray="6 8"
        />

        <path
          d="M -50,500 Q 500,620 950,480 T 1500,610"
          fill="none"
          stroke="#063B2A"
          strokeWidth="1"
          strokeOpacity="0.08"
        />
      </svg>
    </div>
  );
};
