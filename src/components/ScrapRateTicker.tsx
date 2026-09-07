import React from 'react';
import { ScrapRate } from '../types';

interface ScrapRateTickerProps {
  rates: ScrapRate[];
  variant?: 'ribbon' | 'compact';
}

export const ScrapRateTicker: React.FC<ScrapRateTickerProps> = ({
  rates,
  variant = 'ribbon',
}) => {
  if (variant === 'compact') {
    return (
      <div className="w-full bg-[#FFFFFF] rounded-xl px-3 py-2 overflow-x-auto shadow-xs flex items-center gap-4 scrollbar-none border border-[#DCE5DE]">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#3FA66B] animate-pulse"></span>
          <span className="text-[10px] uppercase tracking-wider text-[#174D35] font-bold">
            Live Scrap Rates
          </span>
        </div>
        <div className="h-3.5 w-px bg-[#DCE5DE] shrink-0"></div>
        {rates.map((rate) => (
          <div key={rate.id} className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-[#65736A]">{rate.name}:</span>
            <span className="font-code-metric text-xs text-[#172019] font-semibold">
              {rate.unit.replace('/kg', '')}{rate.rate}/{rate.unit.includes('/pc') ? 'pc' : 'kg'}
            </span>
            <span className={`material-symbols-outlined text-[13px] ${
              rate.trend === 'up' ? 'text-[#3FA66B]' : 'text-[#65736A]'
            }`}>
              {rate.trend === 'up' ? 'arrow_upward' : 'horizontal_rule'}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto no-scrollbar -mx-4 px-4 pt-1">
      <div className="flex items-center gap-2 min-w-max py-1">
        <div className="flex items-center gap-1.5 bg-[#E8F3EB] px-3 py-1.5 rounded-full border border-[#DCE5DE]">
          <span className="w-2 h-2 rounded-full bg-[#3FA66B] animate-pulse"></span>
          <span className="text-[10px] text-[#174D35] uppercase tracking-wider font-bold">
            Live Mandi Rates
          </span>
        </div>

        {rates.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-1.5 bg-[#FFFFFF] px-3 py-1.5 rounded-full border border-[#DCE5DE] shadow-xs hover:border-[#3FA66B]/60 transition-colors"
          >
            <span className="text-xs font-medium text-[#172019]">{item.name}</span>
            <span className="font-code-metric text-xs text-[#3FA66B] font-bold">
              ₹{item.rate}/{item.unit.includes('/pc') ? 'pc' : 'kg'}
            </span>
            <span className={`material-symbols-outlined text-[14px] ${
              item.trend === 'up' ? 'text-[#3FA66B]' : 'text-[#65736A]'
            }`}>
              {item.trend === 'up' ? 'trending_up' : 'trending_flat'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
