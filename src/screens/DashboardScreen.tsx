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
    <div className="flex flex-col w-full max-w-5xl mx-auto px-4 sm:px-6 gap-6 pt-2 pb-24 text-[#12352A]">
      {/* 1. Scrap Rates Ticker Ribbon */}
      <ScrapRateTicker rates={rates} variant="ribbon" />

      {/* 2. Premium Deep Forest Profile & Impact Card */}
      <div className="relative w-full rounded-3xl bg-gradient-to-r from-[#043324] via-[#0B5138] to-[#16A765] p-6 shadow-xl overflow-hidden border border-[#16A765]/30 text-[#FFFFFF]">
        {/* Soft green ambient glow */}
        <div className="absolute -top-12 -right-12 w-56 h-56 bg-[#45C96B]/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-13 h-13 rounded-full bg-[#FFFFFF]/15 backdrop-blur-md flex items-center justify-center text-[#FFFFFF] shadow-inner border border-[#FFFFFF]/30">
                <span className="material-symbols-outlined text-[28px]">eco</span>
              </div>
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#45C96B] flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[11px] text-[#063B2A] font-extrabold">
                  check
                </span>
              </span>
            </div>

            <div
              className="flex flex-col cursor-pointer group"
              onClick={onOpenAccountModal}
              title="Click to view Account, Login or Register options"
            >
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#E9F8EF]">
                {t('goodMorning')} 👋
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-headline text-2xl font-extrabold text-[#FFFFFF] group-hover:text-[#45C96B] transition-colors">
                  {userProfile.name}
                </span>
                <span className="material-symbols-outlined text-[#E9F8EF]/70 group-hover:text-[#45C96B] text-[18px] transition-colors">
                  edit_square
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-[#45C96B] text-[15px]">
                  verified
                </span>
                <span className="text-xs text-[#E9F8EF] font-bold">
                  {userProfile.status}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAccountModal && (
              <button
                onClick={onOpenAccountModal}
                className="h-9 px-3 rounded-full bg-[#FFFFFF]/15 hover:bg-[#FFFFFF]/25 text-[#FFFFFF] flex items-center gap-1.5 transition-all active:scale-95 border border-[#FFFFFF]/25 text-xs font-bold backdrop-blur-md cursor-pointer"
                type="button"
                title="Account, Login & Register"
              >
                <span className="material-symbols-outlined text-[#45C96B] text-[16px]">
                  manage_accounts
                </span>
                <span className="hidden sm:inline">{t('account')}</span>
              </button>
            )}

            <button
              onClick={onOpenCertificate}
              className="h-9 px-3.5 rounded-full bg-[#45C96B] hover:bg-[#16A765] text-[#063B2A] flex items-center gap-1.5 transition-all active:scale-95 text-xs font-extrabold shadow-md cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">
                workspace_premium
              </span>
              <span>{t('certificate')}</span>
            </button>
          </div>
        </div>

        {/* 2-Column Impact Stats Highlight */}
        <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-[#FFFFFF]/20 relative z-10">
          <div className="p-3 rounded-2xl bg-[#FFFFFF]/10 backdrop-blur-md border border-[#FFFFFF]/20">
            <span className="text-[10px] font-bold text-[#E9F8EF]/80 uppercase tracking-widest block">{t('wasteRecycled')}</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-headline text-3xl font-extrabold text-[#FFFFFF]">{impactMetrics.dryDivertedKg}</span>
              <span className="text-sm font-extrabold text-[#45C96B]">kg</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#FFFFFF]/10 backdrop-blur-md border border-[#FFFFFF]/20">
            <span className="text-[10px] font-bold text-[#E9F8EF]/80 uppercase tracking-widest block">{t('ecoCreditsBalance')}</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-headline text-3xl font-extrabold text-[#FFFFFF]">{userProfile.points}</span>
              <span className="text-sm font-extrabold text-[#45C96B]">Pts</span>
            </div>
          </div>
        </div>

        {/* Rank Progress Bar */}
        <div className="mt-3 relative z-10">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-200">{userProfile.levelTitle}</span>
              <span className="px-2 py-0.5 rounded-full bg-[#16A765]/20 border border-[#16A765]/40 text-[#45C96B] text-[9px] font-bold tracking-wider uppercase">
                {t('level')} {userProfile.level}
              </span>
            </div>
            <span className="font-code-metric text-xs text-gray-400">
              {userProfile.points} / {userProfile.maxPoints} Pts
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-[#242824] overflow-hidden border border-[#333333]">
            <div
              className="h-full rounded-full bg-[#16A765] transition-all duration-700 shadow-xs"
              style={{ width: `${(userProfile.points / userProfile.maxPoints) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 3. Dynamic AI Eco Score Card */}
      <div className="w-full rounded-2xl bg-[#FFFFFF] p-5 shadow-sm relative overflow-hidden border border-[#D8EADF]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E8F8EE] border border-[#D8EADF] flex items-center justify-center text-[#16A765]">
              <span className="material-symbols-outlined text-[20px]">psychology</span>
            </div>
            <div>
              <h2 className="font-editorial italic text-base font-bold text-[#12352A]">{t('aiEcoScore')}</h2>
              <span className="text-[9px] uppercase tracking-[0.15em] text-[#087A4B] font-bold block -mt-0.5">
                {t('geminiRealTimeModel')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E8F8EE] text-[#087A4B] border border-[#D8EADF]">
            <span className="material-symbols-outlined text-[14px] text-[#16A765]">trending_up</span>
            <span className="text-[10px] font-bold">{userProfile.weeklyGrowth}</span>
          </div>
        </div>

        {/* Center Radial & Tier info */}
        <div className="flex items-center justify-between bg-[#F3FBF6] rounded-xl p-4 mb-3 border border-[#D8EADF]">
          <div className="relative flex items-center justify-center w-24 h-24 shrink-0">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                className="text-[#E8F8EE] fill-none"
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="7"
              ></circle>
              <circle
                className="text-[#16A765] fill-none transition-all duration-1000"
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
              <span className="font-editorial text-3xl font-bold text-[#12352A] tracking-tight">
                {userProfile.ecoScore}
              </span>
              <span className="text-[10px] text-[#60766C] font-code-metric -mt-1">/ 100</span>
            </div>
          </div>

          <div className="flex flex-col flex-1 pl-4">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8F8EE] text-[#087A4B] w-fit mb-1 border border-[#D8EADF]">
              <span className="material-symbols-outlined text-[13px] text-[#16A765]">military_tech</span>
              <span className="text-[9px] uppercase tracking-wider font-bold">
                {userProfile.tier}
              </span>
            </div>
            <p className="text-xs font-semibold text-[#12352A]">{userProfile.scoreDescription}</p>
            <p className="text-[11px] text-[#60766C] mt-0.5">{userProfile.scoreRegion}</p>
          </div>
        </div>

        {/* AI Personalized Recommendations */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-[#60766C] font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[#16A765] text-[14px]">auto_awesome</span>
            {t('aiSmartRecommendations')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {userProfile.recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-[#F3FBF6] px-3 py-1.5 rounded-lg text-[#12352A] text-xs border border-[#D8EADF]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A765]"></span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Real-Time Impact Metrics 2x2 Grid */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs uppercase tracking-widest text-[#087A4B] font-bold">{t('dashboard')} • {t('realTimeImpact')}</h3>
          <span className="font-editorial italic text-xs text-[#60766C]">
            {impactMetrics.lastUpdated}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Total Scans */}
          <div
            onClick={() => onNavigate('scan')}
            className="rounded-2xl bg-[#FFFFFF] p-4 flex flex-col justify-between shadow-sm border border-[#D8EADF] cursor-pointer hover:border-[#16A765]/60 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-[#60766C] font-bold">{t('totalScans')}</span>
              <div className="w-7 h-7 rounded-lg bg-[#E8F8EE] border border-[#D8EADF] flex items-center justify-center text-[#16A765]">
                <span className="material-symbols-outlined text-[16px]">document_scanner</span>
              </div>
            </div>
            <div className="mt-3">
              <span className="font-editorial text-3xl font-bold text-[#12352A]">
                {impactMetrics.totalScans}
              </span>
              <span className="text-[11px] text-[#60766C] block mt-0.5">{t('itemsAiAnalyzed')}</span>
            </div>
          </div>

          {/* Diverted */}
          <div className="rounded-2xl bg-[#FFFFFF] p-4 flex flex-col justify-between shadow-sm border border-[#D8EADF]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-[#60766C] font-bold">{t('diverted')}</span>
              <div className="w-7 h-7 rounded-lg bg-[#E8F8EE] border border-[#D8EADF] flex items-center justify-center text-[#16A765]">
                <span className="material-symbols-outlined text-[16px]">takeout_dining</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1">
                <span className="font-editorial text-3xl font-bold text-[#12352A]">
                  {impactMetrics.dryDivertedKg}
                </span>
                <span className="text-xs text-[#16A765] font-bold">kg</span>
              </div>
              <span className="text-[11px] text-[#60766C] block mt-0.5">{t('dryRecyclables')}</span>
            </div>
          </div>

          {/* CO2 Offset */}
          <div className="rounded-2xl bg-[#FFFFFF] p-4 flex flex-col justify-between shadow-sm border border-[#D8EADF]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-[#60766C] font-bold">{t('co2Offset')}</span>
              <div className="w-7 h-7 rounded-lg bg-[#E8F8EE] border border-[#D8EADF] flex items-center justify-center text-[#16A765]">
                <span className="material-symbols-outlined text-[16px]">energy_savings_leaf</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1">
                <span className="font-editorial text-3xl font-bold text-[#12352A]">
                  {impactMetrics.co2OffsetKg}
                </span>
                <span className="text-xs text-[#16A765] font-bold">kg</span>
              </div>
              <span className="text-[11px] text-[#60766C] block mt-0.5">{t('greenhouseGasesSaved')}</span>
            </div>
          </div>

          {/* Pickups */}
          <div
            onClick={() => onNavigate('facilities')}
            className="rounded-2xl bg-[#FFFFFF] p-4 flex flex-col justify-between shadow-sm border border-[#D8EADF] cursor-pointer hover:border-[#16A765]/60 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-[#60766C] font-bold">{t('pickups')}</span>
              <div className="w-7 h-7 rounded-lg bg-[#E8F8EE] border border-[#D8EADF] flex items-center justify-center text-[#16A765]">
                <span className="material-symbols-outlined text-[16px]">local_shipping</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1">
                <span className="font-editorial text-3xl font-bold text-[#12352A]">
                  {impactMetrics.pickupsDone}
                </span>
                <span className="text-xs text-[#16A765] font-bold">{t('done')}</span>
              </div>
              <span className="text-[11px] text-[#60766C] block mt-0.5">{t('doorstepScrapSales')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Waste Segregation Breakdown visual bar */}
      <div className="w-full rounded-2xl bg-[#FFFFFF] p-5 shadow-sm flex flex-col gap-3 border border-[#D8EADF]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E8F8EE] border border-[#D8EADF] flex items-center justify-center text-[#16A765]">
              <span className="material-symbols-outlined text-[20px]">donut_large</span>
            </div>
            <h3 className="font-editorial italic text-base font-bold text-[#12352A]">{t('segregationBreakdown')}</h3>
          </div>
          <span className="font-code-metric text-xs text-[#60766C]">{t('thirtyDays')}</span>
        </div>

        {/* Multi-Segment Visual Bar */}
        <div className="w-full h-2 rounded-full bg-[#E8F8EE] flex overflow-hidden border border-[#D8EADF]">
          <div
            className="h-full bg-[#2563EB] transition-all"
            style={{ width: `${segregation.dryRecyclable}%` }}
            title={`${segregation.dryRecyclable}% ${t('dryRecyclable')}`}
          ></div>
          <div
            className="h-full bg-[#16A765] transition-all"
            style={{ width: `${segregation.organicWet}%` }}
            title={`${segregation.organicWet}% ${t('organicWet')}`}
          ></div>
          <div
            className="h-full bg-[#D97706] transition-all"
            style={{ width: `${segregation.eWaste}%` }}
            title={`${segregation.eWaste}% ${t('eWaste')}`}
          ></div>
          <div
            className="h-full bg-[#DC2626] transition-all"
            style={{ width: `${segregation.hazardous}%` }}
            title={`${segregation.hazardous}% ${t('hazardous')}`}
          ></div>
        </div>

        {/* Legend Tags */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#F3FBF6] border border-[#D8EADF]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
              <span className="text-xs font-medium text-[#12352A]">{t('dryRecyclable')}</span>
            </div>
            <span className="font-code-metric text-xs text-[#12352A] font-bold">
              {segregation.dryRecyclable}%
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-[#F3FBF6] border border-[#D8EADF]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A765]"></span>
              <span className="text-xs font-medium text-[#12352A]">{t('organicWet')}</span>
            </div>
            <span className="font-code-metric text-xs text-[#16A765] font-bold">
              {segregation.organicWet}%
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-[#F3FBF6] border border-[#D8EADF]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]"></span>
              <span className="text-xs font-medium text-[#12352A]">{t('eWaste')}</span>
            </div>
            <span className="font-code-metric text-xs text-[#D97706] font-bold">
              {segregation.eWaste}%
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-[#F3FBF6] border border-[#D8EADF]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]"></span>
              <span className="text-xs font-medium text-[#12352A]">{t('hazardous')}</span>
            </div>
            <span className="font-code-metric text-xs text-[#DC2626] font-bold">
              {segregation.hazardous}%
            </span>
          </div>
        </div>
      </div>

      {/* 6. Active Daily Quest / Challenge Card */}
      <div className="w-full rounded-2xl bg-[#FFFFFF] p-5 shadow-sm relative overflow-hidden border border-[#D8EADF]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#E8F8EE] border border-[#D8EADF] flex items-center justify-center text-[#16A765] shadow-xs">
              <span className="material-symbols-outlined text-[22px]">flag</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-[#087A4B] font-bold">
                  {dailyQuest.category}
                </span>
                <span className="w-1 h-1 rounded-full bg-[#D8EADF]"></span>
                <span className="text-[10px] text-[#60766C]">{dailyQuest.expiresIn}</span>
              </div>
              <h4 className="text-sm font-bold text-[#12352A] mt-0.5">{dailyQuest.title}</h4>
            </div>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-[#E8F8EE] text-[#087A4B] font-code-metric text-xs font-bold border border-[#D8EADF]">
            +{dailyQuest.pointsReward} Pts
          </div>
        </div>

        {/* Progress meter */}
        <div className="mt-3 flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#60766C]">Household item scans</span>
            <span className="font-code-metric text-[#16A765] font-bold">
              {dailyQuest.completedCount} / {dailyQuest.totalRequired} Completed
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#E8F8EE] overflow-hidden border border-[#D8EADF]">
            <div
              className="h-full rounded-full bg-[#16A765] transition-all duration-500"
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
                ? 'bg-[#E8F8EE] text-[#087A4B] border border-[#D8EADF] cursor-default'
                : 'bg-[#16A765] text-[#FFFFFF] hover:bg-[#087A4B]'
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
            className="px-3 py-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F3FBF6] text-[#12352A] text-xs flex items-center justify-center gap-1 active:scale-95 transition-all border border-[#D8EADF] shadow-xs"
            type="button"
          >
            <span className="material-symbols-outlined text-[17px]">share</span>
          </button>
        </div>
      </div>

      {/* 6.5 Persistent User Activity History Preview */}
      <div className="w-full rounded-2xl bg-[#FFFFFF] p-5 shadow-sm border border-[#D8EADF] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E8F8EE] border border-[#D8EADF] flex items-center justify-center text-[#16A765]">
              <span className="material-symbols-outlined text-[20px]">history</span>
            </div>
            <div>
              <h3 className="font-editorial italic text-base font-bold text-[#12352A]">{t('recentActivity')}</h3>
              <span className="text-[10px] text-[#60766C] font-medium">{t('realTimeBackendLog')}</span>
            </div>
          </div>
          {onOpenActivityHistory && (
            <button
              onClick={onOpenActivityHistory}
              className="text-xs text-[#16A765] font-bold flex items-center gap-0.5 hover:underline"
              type="button"
            >
              {t('viewFullTimeline')} <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          )}
        </div>

        {recentActivities.length === 0 ? (
          <p className="text-xs text-[#60766C] italic py-2">{t('noRecentActivity')}</p>
        ) : (
          <div className="space-y-2">
            {recentActivities.slice(0, 3).map((act) => (
              <div
                key={act.id}
                onClick={onOpenActivityHistory}
                className="p-2.5 rounded-xl bg-[#F3FBF6] border border-[#D8EADF] flex items-center justify-between gap-2 cursor-pointer hover:border-[#16A765]/60 transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#E8F8EE] text-[#16A765] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[16px]">
                      {act.activity_type.startsWith('PICKUP') ? 'local_shipping' : act.activity_type === 'WASTE_SCANNED' ? 'qr_code_scanner' : 'stars'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#12352A] truncate">{act.title}</p>
                    <p className="text-[11px] text-[#60766C] truncate">{act.description}</p>
                  </div>
                </div>
                {act.eco_credits && (
                  <span className="text-[10px] font-bold text-[#16A765] bg-[#E8F8EE] px-2 py-0.5 rounded-full shrink-0 border border-[#D8EADF]">
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
          <h3 className="text-xs uppercase tracking-widest text-[#087A4B] font-bold">{t('communityCleanMissions')}</h3>
          <button
            onClick={() => onNavigate('guide')}
            className="text-xs text-[#16A765] font-bold flex items-center gap-0.5 hover:underline"
            type="button"
          >
            {t('viewAll')} <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {missions.map((mission) => (
            <div
              key={mission.id}
              onClick={() => onSelectMission && onSelectMission(mission)}
              className="flex flex-col rounded-2xl bg-[#FFFFFF] overflow-hidden shadow-sm border border-[#D8EADF] group cursor-pointer hover:border-[#16A765]/60 transition-all"
            >
              <div className="relative w-full h-28 overflow-hidden bg-[#E8F8EE]">
                <img
                  src={mission.image}
                  alt={mission.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#FFFFFF]/90 backdrop-blur-md text-[#087A4B] text-[10px] font-bold border border-[#D8EADF]">
                  {mission.tag}
                </span>
              </div>
              <div className="p-3 flex flex-col gap-1">
                <h5 className="text-xs font-semibold text-[#12352A] truncate">{mission.title}</h5>
                <span className="text-[11px] text-[#60766C] truncate">{mission.location}</span>
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-[#D8EADF]">
                  <span className="text-[10px] text-[#16A765] font-bold">
                    +{mission.rewardPoints} Pts
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-[#60766C] group-hover:translate-x-0.5 transition-transform">
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
