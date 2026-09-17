import React, { useState, useEffect } from 'react';
import { DbRewardItem, DbRewardRedemption, UserEcoProfile, DbEcoTxItem, DbPartner } from '../types';
import { api } from '../services/api';
import { useI18n } from '../i18n';

interface RewardsScreenProps {
  userProfile?: UserEcoProfile;
  onDeductPoints: (points: number, reason: string) => void;
  onOpenCertificate: () => void;
  onOpenPartnerDashboard?: () => void;
}

export const RewardsScreen: React.FC<RewardsScreenProps> = ({
  userProfile,
  onDeductPoints,
  onOpenCertificate,
  onOpenPartnerDashboard,
}) => {
  const { t } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dbRewards, setDbRewards] = useState<DbRewardItem[]>([]);
  const [dbPartners, setDbPartners] = useState<DbPartner[]>([]);
  const [claimedRedemptions, setClaimedRedemptions] = useState<DbRewardRedemption[]>([]);
  const [creditHistory, setCreditHistory] = useState<DbEcoTxItem[]>([]);
  const [ledgerBalance, setLedgerBalance] = useState<number>(userProfile?.points || 0);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [activeRewardModal, setActiveRewardModal] = useState<DbRewardItem | null>(null);
  const [unlockedRedemption, setUnlockedRedemption] = useState<DbRewardRedemption | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const loadRewardsAndPartners = async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = userProfile?.id || 'usr_aditi';
      const userPoints = userProfile?.points || 0;

      const [rewardsData, partnersData, redemptionsData, walletSummary] = await Promise.all([
        api
          .getRewards(selectedCategory === 'all' || selectedCategory === 'claimed' ? undefined : selectedCategory)
          .catch((err) => {
            console.warn('[RewardsScreen] getRewards API call warning:', err);
            return [];
          }),
        api.getPartners({ verifiedOnly: true }).catch((err) => {
          console.warn('[RewardsScreen] getPartners API call warning:', err);
          return [];
        }),
        api.getRedemptions(userId).catch((err) => {
          console.warn('[RewardsScreen] getRedemptions API call warning:', err);
          return [];
        }),
        api.getWalletSummary().catch((err) => {
          console.warn('[RewardsScreen] getWalletSummary API call warning:', err);
          return { ecoCredits: userPoints, recentTransactions: [], activeVouchers: [] };
        }),
      ]);

      const validRewards = Array.isArray(rewardsData) ? rewardsData : [];
      const validPartners = Array.isArray(partnersData) ? partnersData : [];
      const validRedemptions = Array.isArray(redemptionsData) ? redemptionsData : walletSummary.activeVouchers || [];

      setDbRewards(validRewards);
      setDbPartners(validPartners);
      setClaimedRedemptions(validRedemptions);
      setLedgerBalance(walletSummary?.ecoCredits ?? userPoints);
      setCreditHistory(Array.isArray(walletSummary?.recentTransactions) ? walletSummary.recentTransactions : []);
    } catch (err: any) {
      console.error('[RewardsScreen] Error fetching rewards ecosystem data:', err);
      setError(err?.message || 'Unable to load rewards.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRewardsAndPartners();
  }, [selectedCategory, userProfile?.id]);

  const safeDbRewards = Array.isArray(dbRewards) ? dbRewards : [];
  const safeClaimedRedemptions = Array.isArray(claimedRedemptions) ? claimedRedemptions : [];
  const safeDbPartners = Array.isArray(dbPartners) ? dbPartners : [];
  const safeCreditHistory = Array.isArray(creditHistory) ? creditHistory : [];

  // Derive available categories dynamically from active rewards
  const categoryMap: Record<string, { label: string; icon: string }> = {
    food: { label: 'Food & Dining', icon: 'lunch_dining' },
    shopping: { label: 'Shopping & Groceries', icon: 'shopping_basket' },
    entertainment: { label: 'Entertainment & Movies', icon: 'movie' },
    student: { label: 'Student Benefits', icon: 'school' },
    travel: { label: 'Travel & Mobility', icon: 'electric_scooter' },
    eco: { label: 'Eco-Friendly Brands', icon: 'compost' },
    local: { label: 'Local Hyderabad', icon: 'storefront' },
    digital_vouchers: { label: 'Digital Vouchers', icon: 'card_membership' },
    sustainability_rewards: { label: 'Sustainability Rewards', icon: 'eco' },
  };

  // Only present category tabs that exist in safeDbRewards
  const activeCategories = Array.from(
    new Set(safeDbRewards.map((r) => r?.reward_category || r?.category || 'eco'))
  );

  const categories = [
    { id: 'all', label: 'All Rewards', icon: 'auto_awesome' },
    ...activeCategories
      .filter((cat) => cat && categoryMap[cat])
      .map((cat) => ({ id: cat, label: categoryMap[cat].label, icon: categoryMap[cat].icon })),
    { id: 'claimed', label: `My Rewards (${safeClaimedRedemptions.length})`, icon: 'receipt_long' },
  ];

  const filteredRewards =
    selectedCategory === 'all'
      ? safeDbRewards
      : selectedCategory === 'claimed'
      ? []
      : safeDbRewards.filter(
          (r) =>
            (r?.reward_category || r?.category) === selectedCategory ||
            (selectedCategory === 'local' && r?.city_scope === 'Hyderabad')
        );

  const effectivePoints = ledgerBalance ?? userProfile?.points ?? userProfile?.eco_credits ?? 0;

  const handleRedeemClick = (reward: DbRewardItem) => {
    if (effectivePoints < reward.credits_required) {
      alert(
        `Insufficient Eco Credits! Your ledger balance is ${effectivePoints} credits, but this ${reward.partner_name} voucher requires ${reward.credits_required} credits. Complete verified waste pickups to earn credits!`
      );
      return;
    }
    setActiveRewardModal(reward);
  };

  const handleConfirmRedeem = async (reward: DbRewardItem) => {
    try {
      setRedeeming(true);
      // Atomic server-side redemption execution with provider integration
      const res = await api.redeemReward(userProfile?.id || 'usr_aditi', reward.id);

      onDeductPoints(reward.credits_required, `Redeemed ${reward.partner_name} (${reward.discount_value || reward.reward_value})`);
      setUnlockedRedemption(res.redemption);
      setLedgerBalance(res.remaining_credits ?? Math.max(0, effectivePoints - reward.credits_required));
      loadRewardsAndPartners();
    } catch (err: any) {
      alert(err.message || 'Redemption failed. Eco credits have been safely returned.');
    } finally {
      setRedeeming(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText?.(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto px-4 sm:px-6 gap-6 pt-2 pb-24 text-[#12352A]">
      {/* 1. Rewards Balance & Sovereign Credit Header */}
      <div className="rounded-3xl bg-gradient-to-r from-[#043324] via-[#0B5138] to-[#16A765] p-6 text-white shadow-md relative overflow-hidden border border-[#D8EADF]/20">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#45C96B]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md text-[#E8F8EE] border border-white/20">
              Green Sovereign Credits
            </div>
            <div className="flex items-center gap-2">
              <span className="font-editorial italic text-xs text-[#E8F8EE] font-bold">
                Verified Eco Partners
              </span>
              {onOpenPartnerDashboard && (
                <button
                  type="button"
                  onClick={onOpenPartnerDashboard}
                  className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-white/15 text-white hover:bg-white/25 border border-white/20 transition-all backdrop-blur-sm"
                >
                  Partner Portal
                </button>
              )}
            </div>
          </div>

          <h1 className="font-editorial italic text-3xl sm:text-4xl font-bold text-white tracking-tight mt-1">
            Eco Rewards & Vouchers
          </h1>
          <p className="text-xs sm:text-sm text-[#E8F8EE]/80 leading-relaxed max-w-2xl">
            Redeem your verified waste segregation and doorstep pickup credits for authentic partner vouchers, food discounts, student passes, and eco-friendly products!
          </p>

          {/* User Credits Card */}
          <div className="mt-2 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#E8F8EE]/80 font-bold">
                Available Eco Balance
              </span>
              <div className="font-editorial text-3xl font-bold text-white mt-0.5 flex items-baseline gap-1.5">
                {effectivePoints}
                <span className="font-sans text-xs font-semibold text-[#45C96B]">{t('ecoCredits')}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              <button
                onClick={() => setShowHistoryModal(true)}
                className="h-9 px-3.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 font-bold text-xs active:scale-95 transition-all flex items-center gap-1.5 shadow-sm backdrop-blur-sm"
                type="button"
                title="View Credit History"
              >
                <span className="material-symbols-outlined text-[17px] text-[#45C96B]">history</span>
                <span>{t('recent')}</span>
              </button>

              <button
                onClick={onOpenCertificate}
                className="h-9 px-4 rounded-xl bg-[#16A765] hover:bg-[#087A4B] text-white font-bold text-xs active:scale-95 transition-all flex items-center gap-1.5 shadow-sm border border-white/20"
                type="button"
              >
                <span className="material-symbols-outlined text-[17px]">workspace_premium</span>
                <span>{t('certificate')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Partner Category Tabs Horizontal Scroll */}
      <div className="p-1.5 bg-[#F3FBF6] rounded-2xl border border-[#D8EADF] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? 'bg-[#16A765] text-[#FFFFFF] shadow-sm font-bold border border-[#16A765]'
                  : 'bg-[#FFFFFF] text-[#60766C] hover:bg-[#E8F8EE] hover:text-[#12352A] border border-[#D8EADF]'
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. CLAIMED VOUCHERS VIEW */}
      {selectedCategory === 'claimed' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-widest text-[#12352A] font-bold">
              My Redeemed Vouchers ({safeClaimedRedemptions.length})
            </h2>
          </div>

          {safeClaimedRedemptions.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] shadow-sm flex flex-col items-center justify-center text-center gap-2">
              <div className="w-12 h-12 rounded-full bg-[#E8F8EE] border border-[#D8EADF] flex items-center justify-center text-[#16A765]">
                <span className="material-symbols-outlined text-[24px]">receipt_long</span>
              </div>
              <h3 className="text-sm font-bold text-[#12352A]">{t('available')}</h3>
              <p className="text-xs text-[#60766C] max-w-xs">
                You haven&apos;t redeemed any vouchers yet. Complete doorstep waste pickups to earn Eco Credits and redeem partner vouchers!
              </p>
              <button
                onClick={() => setSelectedCategory('all')}
                className="mt-2 px-4 py-2 rounded-xl bg-[#16A765] hover:bg-[#087A4B] text-[#FFFFFF] text-xs font-bold transition-all shadow-sm"
                type="button"
              >
                Browse Available Rewards
              </button>
            </div>
          ) : (
            safeClaimedRedemptions.map((claim) => (
              <div
                key={claim.id}
                className="rounded-2xl bg-[#FFFFFF] p-5 border border-[#D8EADF] shadow-sm flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#16A765]">
                      {claim.partner_name || 'Eco Partner'} • {claim.discount_value || 'Voucher'}
                    </span>
                    <h4 className="text-sm font-bold text-[#12352A] mt-0.5">{claim.reward_title || 'Partner Reward'}</h4>
                    <span className="text-[11px] text-[#60766C]">Claimed on {claim.redemption_date || claim.redeemed_at || 'Recently'}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    claim.redemption_status === 'USED' || claim.status === 'USED'
                      ? 'bg-[#F3FBF6] text-[#60766C] border-[#D8EADF]'
                      : 'bg-[#E8F8EE] text-[#087A4B] border-[#D8EADF]'
                  }`}>
                    {claim.redemption_status === 'USED' || claim.status === 'USED' ? 'Redeemed On-Spot' : 'Active Voucher'}
                  </span>
                </div>

                {/* Voucher Code Box */}
                <div className="p-3.5 rounded-xl bg-[#F3FBF6] border border-[#D8EADF] flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-wider text-[#60766C]">Voucher Code</span>
                    <span className="font-mono text-base font-bold text-[#16A765] tracking-wider select-all">
                      {claim.voucher_code || claim.redemption_code}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyCode(claim.voucher_code || claim.redemption_code || '')}
                    className="px-3.5 py-1.5 rounded-xl bg-[#16A765] hover:bg-[#087A4B] text-[#FFFFFF] text-xs font-bold flex items-center gap-1 active:scale-95 transition-all shadow-xs"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[15px]">content_copy</span>
                    <span>Copy</span>
                  </button>
                </div>

                <div className="text-[11px] text-[#60766C] bg-[#F3FBF6] p-3 rounded-xl border border-[#D8EADF]">
                  <strong className="text-[#12352A]">How to use:</strong> {claim.redemption_instructions || claim.how_to_redeem || 'Present this code at partner checkout.'}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 4. VOUCHER CARDS GRID */}
      {selectedCategory !== 'claimed' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-widest text-[#12352A] font-bold">
              Available Partner Rewards ({filteredRewards.length})
            </h2>
            <span className="text-[11px] text-[#60766C]">Instant Verified Delivery</span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[#60766C]">
              <span className="w-6 h-6 border-2 border-[#16A765] border-t-transparent rounded-full animate-spin"></span>
              <span>{t('ecoCredits')}...</span>
            </div>
          ) : error ? (
            <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex flex-col items-center justify-center text-center gap-3 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                <span className="material-symbols-outlined text-[24px]">error_outline</span>
              </div>
              <h3 className="text-sm font-bold text-[#12352A]">Unable to load rewards.</h3>
              <p className="text-xs text-[#60766C] max-w-xs">{error}</p>
              <button
                onClick={loadRewardsAndPartners}
                className="mt-2 px-4 py-2 rounded-xl bg-[#16A765] hover:bg-[#087A4B] text-[#FFFFFF] text-xs font-bold transition-all shadow-sm"
                type="button"
              >
                Try Again
              </button>
            </div>
          ) : filteredRewards.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex flex-col items-center justify-center text-center gap-3 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#E8F8EE] border border-[#D8EADF] flex items-center justify-center text-[#16A765]">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <h3 className="text-sm font-bold text-[#12352A]">No rewards available right now.</h3>
              <p className="text-xs text-[#60766C] max-w-xs leading-relaxed">
                We are actively onboarding genuine verified EcoScan sustainability partners! Check back soon or earn more Eco Credits.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredRewards.map((reward) => {
                const canAfford = effectivePoints >= reward.credits_required;
                const partnerObj = safeDbPartners.find((p) => p.id === reward.partner_id);

                return (
                  <div
                    key={reward.id}
                    className="rounded-2xl bg-[#FFFFFF] p-5 border border-[#D8EADF] shadow-sm flex flex-col gap-3.5 hover:border-[#16A765]/50 transition-all relative overflow-hidden"
                  >
                    {/* Top Partner Badge & Sponsored Tag */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-[#16A765]">
                          verified
                        </span>
                        <span className="text-xs font-bold text-[#12352A]">
                          {reward.partner_name || 'EcoScan Partner'}
                        </span>
                        {partnerObj?.city_availability && (
                          <span className="text-[9px] font-bold text-[#087A4B] bg-[#E8F8EE] px-2 py-0.5 rounded-md border border-[#D8EADF]">
                            {partnerObj.city_availability}
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                          reward.sponsored_type === 'sponsored'
                            ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                            : reward.sponsored_type === 'partner'
                            ? 'bg-[#E8F8EE] text-[#087A4B] border-[#D8EADF]'
                            : 'bg-[#F3FBF6] text-[#60766C] border-[#D8EADF]'
                        }`}
                      >
                        {reward.sponsored_type === 'sponsored'
                          ? 'Sponsored Partner'
                          : reward.sponsored_type === 'partner'
                          ? 'Eco Partner'
                          : 'Organic Reward'}
                      </span>
                    </div>

                    {/* Reward Title & Value */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#E8F8EE] text-[#087A4B] border border-[#D8EADF]">
                            {reward.discount_value || 'Voucher'}
                          </span>
                          <span className="text-[10px] text-[#60766C] uppercase font-semibold">
                            {(reward.voucher_type || 'discount').replace('_', ' ')}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-[#12352A] mt-1 line-clamp-1">
                          {reward.title}
                        </h3>
                        <p className="text-xs text-[#60766C] mt-1 line-clamp-2 leading-relaxed">
                          {reward.description}
                        </p>
                      </div>

                      <div className="flex flex-col items-end shrink-0 pl-1">
                        <span className="font-editorial text-xl font-bold text-[#16A765]">
                          {reward.credits_required}
                        </span>
                        <span className="text-[10px] text-[#60766C] -mt-1">Eco Credits</span>
                      </div>
                    </div>

                    {/* Terms & Action Footer */}
                    <div className="pt-3 border-t border-[#D8EADF] flex items-center justify-between gap-2">
                      <span className="text-[10px] text-[#60766C] truncate flex-1">
                        {reward.terms || 'Standard terms apply.'}
                      </span>

                      <button
                        onClick={() => handleRedeemClick(reward)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shrink-0 ${
                          canAfford
                            ? 'bg-[#16A765] text-[#FFFFFF] hover:bg-[#087A4B] shadow-sm'
                            : 'bg-[#F3FBF6] text-[#60766C] border border-[#D8EADF] hover:bg-[#E8F8EE] hover:text-[#12352A]'
                        }`}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {canAfford ? 'redeem' : 'lock'}
                        </span>
                        <span>{canAfford ? 'Redeem Offer' : `Need ${reward.credits_required - effectivePoints} more`}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. CONFIRMATION / REDEEM POPUP MODAL */}
      {activeRewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#043324]/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#FFFFFF] border border-[#D8EADF] p-6 shadow-xl flex flex-col gap-4 relative text-[#12352A]">
            <button
              onClick={() => {
                setActiveRewardModal(null);
                setUnlockedRedemption(null);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#F3FBF6] border border-[#D8EADF] flex items-center justify-center text-[#60766C] hover:text-[#12352A] hover:bg-[#E8F8EE]"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>

            {!unlockedRedemption ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#E8F8EE] border border-[#D8EADF] flex items-center justify-center text-[#16A765]">
                    <span className="material-symbols-outlined text-[28px]">redeem</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#087A4B]">
                      Confirm Partner Offer Claim
                    </span>
                    <h3 className="text-base font-bold text-[#12352A]">
                      {activeRewardModal.partner_name} ({activeRewardModal.discount_value})
                    </h3>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#F3FBF6] border border-[#D8EADF] flex flex-col gap-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#60766C]">Voucher credit cost:</span>
                    <span className="font-bold text-[#16A765]">{activeRewardModal.credits_required} Eco Credits</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#60766C]">Current Eco Balance:</span>
                    <span className="font-bold text-[#12352A]">{effectivePoints} Eco Credits</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-[#D8EADF]">
                    <span className="text-[#60766C]">Balance after redemption:</span>
                    <span className="font-bold text-[#12352A]">
                      {Math.max(0, effectivePoints - activeRewardModal.credits_required)} Eco Credits
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-[#60766C] leading-relaxed">
                  {activeRewardModal.terms}
                </p>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setActiveRewardModal(null)}
                    className="flex-1 py-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F3FBF6] text-[#12352A] text-xs font-semibold border border-[#D8EADF]"
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={redeeming}
                    onClick={() => handleConfirmRedeem(activeRewardModal)}
                    className="flex-1 py-2.5 rounded-xl bg-[#16A765] hover:bg-[#087A4B] text-[#FFFFFF] text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[17px]">celebration</span>
                    <span>{redeeming ? 'Processing...' : 'Confirm & Redeem'}</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-14 h-14 rounded-full bg-[#E8F8EE] border border-[#16A765]/30 flex items-center justify-center text-[#16A765]">
                    <span className="material-symbols-outlined text-[32px]">check_circle</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#12352A]">Voucher Unlocked! 🎉</h3>
                  <p className="text-xs text-[#60766C]">
                    Here is your exclusive {unlockedRedemption.partner_name || 'partner'} digital voucher code:
                  </p>
                </div>

                {/* Code display with copy */}
                <div className="p-5 rounded-2xl bg-[#E8F8EE] border-2 border-dashed border-[#16A765]/60 flex flex-col items-center gap-3">
                  <span className="text-[10px] uppercase tracking-widest text-[#087A4B] font-bold">
                    YOUR REDEMPTION CODE
                  </span>
                  <span className="font-mono text-2xl font-extrabold text-[#12352A] tracking-wider select-all">
                    {unlockedRedemption.redemption_code || unlockedRedemption.voucher_code}
                  </span>
                  <button
                    onClick={() => handleCopyCode(unlockedRedemption.redemption_code || unlockedRedemption.voucher_code || '')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-sm ${
                      copiedCode
                        ? 'bg-[#087A4B] text-[#FFFFFF]'
                        : 'bg-[#16A765] text-[#FFFFFF] hover:bg-[#087A4B]'
                    }`}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {copiedCode ? 'done' : 'content_copy'}
                    </span>
                    <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy Code'}</span>
                  </button>
                </div>

                <div className="text-[11px] text-[#60766C] bg-[#F3FBF6] p-3.5 rounded-2xl border border-[#D8EADF]">
                  <strong className="text-[#12352A]">How to redeem:</strong>
                  <p className="mt-1">{unlockedRedemption.how_to_redeem || unlockedRedemption.redemption_instructions || 'Present code at partner checkout.'}</p>
                </div>

                <button
                  onClick={() => {
                    setActiveRewardModal(null);
                    setUnlockedRedemption(null);
                    setSelectedCategory('claimed');
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F3FBF6] text-[#12352A] text-xs font-bold border border-[#D8EADF]"
                  type="button"
                >
                  View in My Claimed Vouchers
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 6. CREDIT AUDIT HISTORY MODAL ("Where did I earn/spend?") */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#043324]/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#FFFFFF] border border-[#D8EADF] p-6 shadow-xl flex flex-col gap-4 relative max-h-[85vh] overflow-y-auto text-[#12352A]">
            <div className="flex items-center justify-between pb-2 border-b border-[#D8EADF]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#16A765] text-[22px]">history</span>
                <h3 className="text-base font-bold text-[#12352A]">Eco Credit Audit Log</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-[#F3FBF6] border border-[#D8EADF] flex items-center justify-center text-[#60766C] hover:text-[#12352A] hover:bg-[#E8F8EE]"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-xs text-[#60766C]">
              Transparent record of all Eco Credits earned from verified scrap recycling and spent on partner rewards:
            </p>

            <div className="flex flex-col gap-2">
              {safeCreditHistory.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#60766C]">No transactions recorded yet</div>
              ) : (
                safeCreditHistory.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-2xl bg-[#F3FBF6] border border-[#D8EADF] flex items-center justify-between"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#12352A]">{tx.source}</span>
                      <span className="text-[10px] text-[#60766C]">
                        {tx.created_at ? new Date(tx.created_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : ''}
                      </span>
                    </div>

                    <span
                      className={`font-editorial text-base font-bold ${
                        tx.type === 'EARNED' ? 'text-[#16A765]' : 'text-[#DC2626]'
                      }`}
                    >
                      {tx.type === 'EARNED' ? `+${tx.credits}` : `-${tx.credits}`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
