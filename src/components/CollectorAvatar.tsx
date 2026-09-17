import React, { useState } from 'react';

// Default map of real collector images matching collector names/ids
const COLLECTOR_IMAGE_MAP: Record<string, string> = {
  'col-1': '/images/collectors/raju_kumar.jpg',
  'col-2': '/images/collectors/suresh_gowda.jpg',
  'col-3': '/images/collectors/ramesh_patel.jpg',
  'col-4': '/images/collectors/anita_sharma.jpg',
  'raju': '/images/collectors/raju_kumar.jpg',
  'suresh': '/images/collectors/suresh_gowda.jpg',
  'anita': '/images/collectors/anita_sharma.jpg',
  'ramesh': '/images/collectors/ramesh_patel.jpg',
};

export function getCollectorAvatarByName(nameOrId?: string, customImage?: string): string {
  if (customImage && customImage.trim().length > 0) return customImage;
  if (!nameOrId) return '/images/collectors/raju_kumar.jpg';

  const lower = nameOrId.toLowerCase();
  for (const [key, url] of Object.entries(COLLECTOR_IMAGE_MAP)) {
    if (lower.includes(key)) return url;
  }
  return '/images/collectors/raju_kumar.jpg';
}

interface CollectorAvatarProps {
  name?: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showVerifiedBadge?: boolean;
  verificationStatus?: 'VERIFIED' | 'PENDING' | 'REJECTED' | string;
  className?: string;
  alt?: string;
}

export const CollectorAvatar: React.FC<CollectorAvatarProps> = ({
  name = 'Collector Partner',
  src,
  size = 'md',
  showVerifiedBadge = true,
  verificationStatus = 'VERIFIED',
  className = '',
  alt,
}) => {
  const [imgError, setImgError] = useState(false);

  // Resolved image URL
  const imageUrl = getCollectorAvatarByName(name, src);

  // Compute initials for error/fallback badge
  const initials = name
    .split(' ')
    .filter((part) => part.length > 0 && !part.startsWith('(') && !part.endsWith(')'))
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'CP';

  const isVerified = verificationStatus === 'VERIFIED';

  // Size dimensions
  const sizeClasses = {
    xs: 'w-7 h-7 text-[10px]',
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  }[size];

  const badgeSizeClasses = {
    xs: 'w-3 h-3 text-[8px] -bottom-0.5 -right-0.5',
    sm: 'w-3.5 h-3.5 text-[9px] -bottom-0.5 -right-0.5',
    md: 'w-4 h-4 text-[10px] bottom-0 right-0',
    lg: 'w-5 h-5 text-[12px] bottom-0 right-0',
    xl: 'w-6 h-6 text-[14px] bottom-0.5 right-0.5',
  }[size];

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      <div
        className={`${sizeClasses} rounded-full overflow-hidden border-2 ${
          isVerified ? 'border-[#3FA66B]' : 'border-[#DCE5DE]'
        } bg-[#E8F3EB] shadow-xs flex items-center justify-center`}
      >
        {!imgError ? (
          <img
            src={imageUrl}
            alt={alt || name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-center"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#174D35] to-[#3FA66B] text-[#FFFFFF] font-bold flex items-center justify-center tracking-wider">
            {initials}
          </div>
        )}
      </div>

      {showVerifiedBadge && isVerified && (
        <span
          className={`absolute ${badgeSizeClasses} rounded-full bg-[#3FA66B] text-[#FFFFFF] border-2 border-[#FFFFFF] flex items-center justify-center shadow-2xs`}
          title="Verified Kabadiwala Partner"
        >
          <span className="material-symbols-outlined font-bold text-[inherit]">check</span>
        </span>
      )}
    </div>
  );
};
