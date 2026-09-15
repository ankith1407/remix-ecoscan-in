import React from 'react';
import {
  ScrapRate,
  UserEcoProfile,
  ImpactMetrics,
  SegregationBreakdown,
  DailyQuest,
  CommunityMission,
  ScreenType,
  DbUserActivity,
} from '../types';
import { ScrapRateTicker } from '../components/ScrapRateTicker';
import { useI18n } from '../i18n';

interface DashboardScreenProps {
  rates: ScrapRate[];
  userProfile: UserEcoProfile;
  impactMetrics: ImpactMetrics;
  segregation: SegregationBreakdown;
  dailyQuest: DailyQuest;
  missions: CommunityMission[];
  recentActivities?: DbUserActivity[];
  onClaimQuest: () => void;
  onOpenCertificate: () => void;
  onOpenAccountModal?: () => void;
  onOpenActivityHistory?: () => void;
  onNavigate: (screen: ScreenType) => void;
  onSelectMission?: (mission: CommunityMission) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  rates,
  userProfile,
  impactMetrics,
  segregation,
  dailyQuest,
  missions,
  recentActivities = [],
  onClaimQuest,
  onOpenCertificate,
  onOpenAccountModal,
  onOpenActivityHistory,
  onNavigate,
  onSelectMission,
}) => {
  const { t } = useI18n();
  return (
    <div className="flex flex-col w-full max-w-lg mx-auto px-4 gap-4 pt-1 pb-16 text-[#172019]">
      {/* 1. Scrap Rates Ticker Ribbon */}
      <ScrapRateTicker rates={rates} variant="ribbon" />

      {/* 2. Premium Dark Charcoal Profile & Impact Card */}
      <div className="relative w-full rounded-2xl bg-[#111111] p-5 shadow-lg overflow-hidden border border-[#242824] text-[#FFFFFF]">
        {/* Soft green ambient glow */}
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-[#3FA66B]/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-[#242824] flex items-center justify-center text-[#3FA66B] shadow-inner border border-[#333333]">
                <span className="material-symbols-outlined text-[26px]">eco</span>
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#3FA66B] flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[10px] text-[#FFFFFF] font-bold">
                  check
                </span>
              </span>
            </div>

            <div
              className="flex flex-col cursor-pointer group"
              onClick={onOpenAccountModal}
              title="Click to view Account, Login or Register options"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                {t('goodMorning')} 👋
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-editorial italic text-xl font-bold text-[#FFFFFF] group-hover:text-[#3FA66B] transition-colors">
                  {userProfile.name}
                </span>
                <span className="material-symbols-outlined text-[#65736A] group-hover:text-[#3FA66B] text-[16px] transition-colors">
                  edit_square
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-[#3FA66B] text-[14px]">
                  verified
                </span>
                <span className="text-xs text-emerald-300 font-medium">
                  {userProfile.status}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenAccountModal && (
              <button
                onClick={onOpenAccountModal}
                className="h-8 px-2.5 rounded-full bg-[#242824] hover:bg-[#333333] text-[#FFFFFF] flex items-center gap-1 transition-all active:scale-95 border border-[#333333] text-xs font-bold"
                type="button"
                title="Account, Login & Register"
              >
                <span className="material-symbols-outlined text-[#3FA66B] text-[15px]">
                  manage_accounts
                </span>
                <span className="hidden xs:inline">{t('account')}</span>
              </button>
            )}

            <button
              onClick={onOpenCertificate}
              className="h-8 px-3 rounded-full bg-[#3FA66B] hover:bg-[#348e5b] text-[#FFFFFF] flex items-center gap-1.5 transition-all active:scale-95 text-xs font-bold shadow-xs"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">
                workspace_premium
              </span>
              <span>{t('certificate')}</span>
            </button>
          </div>
        </div>

        {/* 2-Column Impact Stats Highlight */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[#242824] relative z-10">
          <div className="p-2.5 rounded-xl bg-[#1A1D1A] border border-[#2A2E2A]">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Waste Recycled</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-editorial text-2xl font-bold text-[#FFFFFF]">{impactMetrics.dryDivertedKg}</span>
              <span className="text-xs font-bold text-[#3FA66B]">kg</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#1A1D1A] border border-[#2A2E2A]">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Eco Credits Balance</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-editorial text-2xl font-bold text-[#FFFFFF]">{userProfile.points}</span>
              <span className="text-xs font-bold text-[#3FA66B]">Pts</span>
            </div>
          </div>
        </div>

        {/* Rank Progress Bar */}
        <div className="mt-3 relative z-10">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-200">{userProfile.levelTitle}</span>
              <span className="px-2 py-0.5 rounded-full bg-[#3FA66B]/20 border border-[#3FA66B]/40 text-emerald-300 text-[9px] font-bold tracking-wider uppercase">
                Level {userProfile.level}
              </span>
            </div>
            <span className="font-code-metric text-xs text-gray-400">
              {userProfile.points} / {userProfile.maxPoints} Pts
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-[#242824] overflow-hidden border border-[#333333]">
            <div
              className="h-full rounded-full bg-[#3FA66B] transition-all duration-700 shadow-xs"
              style={{ width: `${(userProfile.points / userProfile.maxPoints) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 3. Dynamic AI Eco Score Card */}
      <div className="w-full rounded-2xl bg-[#FFFFFF] p-5 shadow-sm relative overflow-hidden border border-[#DCE5DE]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-center text-[#3FA66B]">
              <span className="material-symbols-outlined text-[20px]">psychology</span>
            </div>
            <div>
              <h2 className="font-editorial italic text-base font-bold text-[#172019]">AI Eco Score</h2>
              <span className="text-[9px] uppercase tracking-[0.15em] text-[#174D35] font-bold block -mt-0.5">
                Gemini 3 Real-Time Model
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E8F3EB] text-[#174D35] border border-[#DCE5DE]">
            <span className="material-symbols-outlined text-[14px] text-[#3FA66B]">trending_up</span>
            <span className="text-[10px] font-bold">{userProfile.weeklyGrowth}</span>
          </div>
        </div>

        {/* Center Radial & Tier info */}
        <div className="flex items-center justify-between bg-[#F5F8F4] rounded-xl p-4 mb-3 border border-[#DCE5DE]">
          <div className="relative flex items-center justify-center w-24 h-24 shrink-0">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                className="text-[#DCE5DE] fill-none"
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="7"
              ></circle>
              <circle
                className="text-[#3FA66B] fill-none transition-all duration-1000"
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * Math.max(0, Math.min(100, userProfile.ecoScore))) / 100}
                strokeLinecap="round"
                strokeWidth="7"
              ></circle>
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="font-editorial text-3xl font-bold text-[#172019] tracking-tight">
                {userProfile.ecoScore}
              </span>
              <span className="text-[10px] text-[#65736A] font-code-metric -mt-1">/ 100</span>
            </div>
          </div>

          <div className="flex flex-col flex-1 pl-4">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8F3EB] text-[#174D35] w-fit mb-1 border border-[#DCE5DE]">
              <span className="material-symbols-outlined text-[13px] text-[#3FA66B]">military_tech</span>
              <span className="text-[9px] uppercase tracking-wider font-bold">
                {userProfile.tier}
              </span>
            </div>
            <p className="text-xs font-semibold text-[#172019]">{userProfile.scoreDescription}</p>
            <p className="text-[11px] text-[#65736A] mt-0.5">{userProfile.scoreRegion}</p>
          </div>
        </div>

        {/* AI Personalized Recommendations */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-[#65736A] font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[#3FA66B] text-[14px]">auto_awesome</span>
            AI Smart Recommendations
          </span>
          <div className="flex flex-wrap gap-1.5">
            {userProfile.recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-[#F5F8F4] px-3 py-1.5 rounded-lg text-[#172019] text-xs border border-[#DCE5DE]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#3FA66B]"></span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Real-Time Impact Metrics 2x2 Grid */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs uppercase tracking-widest text-[#174D35] font-bold">{t('dashboard')} • Real-Time Impact</h3>
          <span className="font-editorial italic text-xs text-[#65736A]">
            {impactMetrics.lastUpdated}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Total Scans */}
          <div
            onClick={() => onNavigate('scan')}
            className="rounded-xl bg-[#FFFFFF] p-4 flex flex-col justify-between shadow-xs border border-[#DCE5DE] cursor-pointer hover:border-[#3FA66B]/60 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-[#65736A] font-bold">Total Scans</span>
              <div className="w-7 h-7 rounded-lg bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-center text-[#3FA66B]">
                <span className="material-symbols-outlined text-[16px]">document_scanner</span>
              </div>
            </div>
            <div className="mt-3">
              <span className="font-editorial text-3xl font-bold text-[#172019]">
                {impactMetrics.totalScans}
              </span>
              <span className="text-[11px] text-[#65736A] block mt-0.5">Items AI analyzed</span>
            </div>
          </div>

          {/* Diverted */}
          <div className="rounded-xl bg-[#FFFFFF] p-4 flex flex-col justify-between shadow-xs border border-[#DCE5DE]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-[#65736A] font-bold">Diverted</span>
              <div className="w-7 h-7 rounded-lg bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-center text-[#3FA66B]">
                <span className="material-symbols-outlined text-[16px]">takeout_dining</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1">
                <span className="font-editorial text-3xl font-bold text-[#172019]">
                  {impactMetrics.dryDivertedKg}
                </span>
                <span className="text-xs text-[#3FA66B] font-bold">kg</span>
              </div>
              <span className="text-[11px] text-[#65736A] block mt-0.5">Dry recyclables</span>
            </div>
          </div>

          {/* CO2 Offset */}
          <div className="rounded-xl bg-[#FFFFFF] p-4 flex flex-col justify-between shadow-xs border border-[#DCE5DE]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-[#65736A] font-bold">CO₂ Offset</span>
              <div className="w-7 h-7 rounded-lg bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-center text-[#3FA66B]">
                <span className="material-symbols-outlined text-[16px]">energy_savings_leaf</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1">
                <span className="font-editorial text-3xl font-bold text-[#172019]">
                  {impactMetrics.co2OffsetKg}
                </span>
                <span className="text-xs text-[#3FA66B] font-bold">kg</span>
              </div>
              <span className="text-[11px] text-[#65736A] block mt-0.5">Greenhouse gases saved</span>
            </div>
          </div>

          {/* Pickups */}
          <div
            onClick={() => onNavigate('facilities')}
            className="rounded-xl bg-[#FFFFFF] p-4 flex flex-col justify-between shadow-xs border border-[#DCE5DE] cursor-pointer hover:border-[#3FA66B]/60 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-[#65736A] font-bold">Pickups</span>
              <div className="w-7 h-7 rounded-lg bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-center text-[#3FA66B]">
                <span className="material-symbols-outlined text-[16px]">local_shipping</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1">
                <span className="font-editorial text-3xl font-bold text-[#172019]">
                  {impactMetrics.pickupsDone}
                </span>
                <span className="text-xs text-[#3FA66B] font-bold">done</span>
              </div>
              <span className="text-[11px] text-[#65736A] block mt-0.5">Doorstep scrap sales</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Waste Segregation Breakdown visual bar */}
      <div className="w-full rounded-2xl bg-[#FFFFFF] p-5 shadow-sm flex flex-col gap-3 border border-[#DCE5DE]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-center text-[#3FA66B]">
              <span className="material-symbols-outlined text-[20px]">donut_large</span>
            </div>
            <h3 className="font-editorial italic text-base font-bold text-[#172019]">Segregation Breakdown</h3>
          </div>
          <span className="font-code-metric text-xs text-[#65736A]">30 Days</span>
        </div>

        {/* Multi-Segment Visual Bar */}
        <div className="w-full h-2 rounded-full bg-[#E8F3EB] flex overflow-hidden border border-[#DCE5DE]">
          <div
            className="h-full bg-[#2563EB] transition-all"
            style={{ width: `${segregation.dryRecyclable}%` }}
            title={`${segregation.dryRecyclable}% Dry Recyclable`}
          ></div>
          <div
            className="h-full bg-[#3FA66B] transition-all"
            style={{ width: `${segregation.organicWet}%` }}
            title={`${segregation.organicWet}% Organic Wet`}
          ></div>
          <div
            className="h-full bg-[#D97706] transition-all"
            style={{ width: `${segregation.eWaste}%` }}
            title={`${segregation.eWaste}% E-Waste`}
          ></div>
          <div
            className="h-full bg-[#DC2626] transition-all"
            style={{ width: `${segregation.hazardous}%` }}
            title={`${segregation.hazardous}% Hazardous`}
          ></div>
        </div>

        {/* Legend Tags */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#F5F8F4] border border-[#DCE5DE]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
              <span className="text-xs font-medium text-[#172019]">Dry Recyclable</span>
            </div>
            <span className="font-code-metric text-xs text-[#172019] font-bold">
              {segregation.dryRecyclable}%
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-[#F5F8F4] border border-[#DCE5DE]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3FA66B]"></span>
              <span className="text-xs font-medium text-[#172019]">Organic Wet</span>
            </div>
            <span className="font-code-metric text-xs text-[#3FA66B] font-bold">
              {segregation.organicWet}%
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-[#F5F8F4] border border-[#DCE5DE]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]"></span>
              <span className="text-xs font-medium text-[#172019]">E-Waste</span>
            </div>
            <span className="font-code-metric text-xs text-[#D97706] font-bold">
              {segregation.eWaste}%
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-[#F5F8F4] border border-[#DCE5DE]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]"></span>
              <span className="text-xs font-medium text-[#172019]">Hazardous</span>
            </div>
            <span className="font-code-metric text-xs text-[#DC2626] font-bold">
              {segregation.hazardous}%
            </span>
          </div>
        </div>
      </div>

      {/* 6. Active Daily Quest / Challenge Card */}
      <div className="w-full rounded-2xl bg-[#FFFFFF] p-5 shadow-sm relative overflow-hidden border border-[#DCE5DE]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-center text-[#3FA66B] shadow-xs">
              <span className="material-symbols-outlined text-[22px]">flag</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-[#174D35] font-bold">
                  {dailyQuest.category}
                </span>
                <span className="w-1 h-1 rounded-full bg-[#DCE5DE]"></span>
                <span className="text-[10px] text-[#65736A]">{dailyQuest.expiresIn}</span>
              </div>
              <h4 className="text-sm font-bold text-[#172019] mt-0.5">{dailyQuest.title}</h4>
            </div>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-[#E8F3EB] text-[#174D35] font-code-metric text-xs font-bold border border-[#DCE5DE]">
            +{dailyQuest.pointsReward} Pts
          </div>
        </div>

        {/* Progress meter */}
        <div className="mt-3 flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#65736A]">Household item scans</span>
            <span className="font-code-metric text-[#3FA66B] font-bold">
              {dailyQuest.completedCount} / {dailyQuest.totalRequired} Completed
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#E8F3EB] overflow-hidden border border-[#DCE5DE]">
            <div
              className="h-full rounded-full bg-[#3FA66B] transition-all duration-500"
              style={{
                width: `${(dailyQuest.completedCount / dailyQuest.totalRequired) * 100}%`,
              }}
            ></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-3.5 flex items-center gap-2">
          <button
            onClick={onClaimQuest}
            disabled={dailyQuest.isClaimed}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all ${
              dailyQuest.isClaimed
                ? 'bg-[#E8F3EB] text-[#174D35] border border-[#DCE5DE] cursor-default'
                : 'bg-[#3FA66B] text-[#FFFFFF] hover:bg-[#174D35]'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">
              {dailyQuest.isClaimed ? 'check_circle' : 'celebration'}
            </span>
            <span>
              {dailyQuest.isClaimed ? 'Claimed! (+20 Eco Pts)' : `Claim +${dailyQuest.pointsReward} Pts`}
            </span>
          </button>

          <button
            onClick={() => {
              navigator.clipboard?.writeText?.(
                'Join me on EcoScan IN! Doing daily waste segregation in Hyderabad ♻️'
              );
              alert('Daily Quest invite link copied to clipboard!');
            }}
            className="px-3 py-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#E8F3EB] text-[#172019] text-xs flex items-center justify-center gap-1 active:scale-95 transition-all border border-[#DCE5DE] shadow-xs"
            type="button"
          >
            <span className="material-symbols-outlined text-[17px]">share</span>
          </button>
        </div>
      </div>

      {/* 6.5 Persistent User Activity History Preview */}
      <div className="w-full rounded-2xl bg-[#FFFFFF] p-5 shadow-sm border border-[#DCE5DE] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-center text-[#3FA66B]">
              <span className="material-symbols-outlined text-[20px]">history</span>
            </div>
            <div>
              <h3 className="font-editorial italic text-base font-bold text-[#172019]">Recent Activity</h3>
              <span className="text-[10px] text-[#65736A] font-medium">Real-Time Backend Log</span>
            </div>
          </div>
          {onOpenActivityHistory && (
            <button
              onClick={onOpenActivityHistory}
              className="text-xs text-[#3FA66B] font-bold flex items-center gap-0.5 hover:underline"
              type="button"
            >
              View Full Timeline <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          )}
        </div>

        {recentActivities.length === 0 ? (
          <p className="text-xs text-[#65736A] italic py-2">No recent activity logged yet.</p>
        ) : (
          <div className="space-y-2">
            {recentActivities.slice(0, 3).map((act) => (
              <div
                key={act.id}
                onClick={onOpenActivityHistory}
                className="p-2.5 rounded-xl bg-[#F5F8F4] border border-[#DCE5DE] flex items-center justify-between gap-2 cursor-pointer hover:border-[#3FA66B]/60 transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#E8F3EB] text-[#3FA66B] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[16px]">
                      {act.activity_type.startsWith('PICKUP') ? 'local_shipping' : act.activity_type === 'WASTE_SCANNED' ? 'qr_code_scanner' : 'stars'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#172019] truncate">{act.title}</p>
                    <p className="text-[11px] text-[#65736A] truncate">{act.description}</p>
                  </div>
                </div>
                {act.eco_credits && (
                  <span className="text-[10px] font-bold text-[#3FA66B] bg-[#E8F3EB] px-2 py-0.5 rounded-full shrink-0 border border-[#DCE5DE]">
                    +{act.eco_credits} Pts
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7. Community Clean Missions */}
      <div className="w-full flex flex-col gap-2.5 mt-1">
        <div className="flex items-center justify-between">
          <h3 className="text-xs uppercase tracking-widest text-[#174D35] font-bold">Community Clean Missions</h3>
          <button
            onClick={() => onNavigate('guide')}
            className="text-xs text-[#3FA66B] font-bold flex items-center gap-0.5 hover:underline"
            type="button"
          >
            View All <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {missions.map((mission) => (
            <div
              key={mission.id}
              onClick={() => onSelectMission && onSelectMission(mission)}
              className="flex flex-col rounded-2xl bg-[#FFFFFF] overflow-hidden shadow-xs border border-[#DCE5DE] group cursor-pointer hover:border-[#3FA66B]/60 transition-all"
            >
              <div className="relative w-full h-28 overflow-hidden bg-[#E8F3EB]">
                <img
                  src={mission.image}
                  alt={mission.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#FFFFFF]/90 backdrop-blur-md text-[#174D35] text-[10px] font-bold border border-[#DCE5DE]">
                  {mission.tag}
                </span>
              </div>
              <div className="p-3 flex flex-col gap-1">
                <h5 className="text-xs font-semibold text-[#172019] truncate">{mission.title}</h5>
                <span className="text-[11px] text-[#65736A] truncate">{mission.location}</span>
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-[#DCE5DE]">
                  <span className="text-[10px] text-[#3FA66B] font-bold">
                    +{mission.rewardPoints} Pts
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-[#65736A] group-hover:translate-x-0.5 transition-transform">
                    arrow_forward
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
