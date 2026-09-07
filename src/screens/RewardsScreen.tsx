import React, { useState, useEffect } from 'react';
import { DbRewardItem, DbRewardRedemption, UserEcoProfile, DbEcoTxItem, DbPartner } from '../types';
import { api } from '../services/api';

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

      const [rewardsData, partnersData, redemptionsData, ledgerData] = await Promise.all([
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
        api.getCreditLedger(userId).catch((err) => {
          console.warn('[RewardsScreen] getCreditLedger API call warning:', err);
          return { ledger_balance: userPoints, transactions: [] };
        }),
      ]);

      const validRewards = Array.isArray(rewardsData) ? rewardsData : [];
      const validPartners = Array.isArray(partnersData) ? partnersData : [];
      const validRedemptions = Array.isArray(redemptionsData) ? redemptionsData : [];

      setDbRewards(validRewards);
      setDbPartners(validPartners);
      setClaimedRedemptions(validRedemptions);
      setLedgerBalance(ledgerData?.ledger_balance ?? userPoints);
      setCreditHistory(Array.isArray(ledgerData?.transactions) ? ledgerData.transactions : []);
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
      setLedgerBalance(res.remaining_credits);
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
    <div className="flex flex-col w-full max-w-lg mx-auto px-4 gap-4 pt-2 pb-24 text-[#172019]">
      {/* 1. Rewards Balance & Sovereign Credit Header */}
      <div className="rounded-2xl bg-[#FFFFFF] p-5 shadow-xs border border-[#DCE5DE] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#E8F3EB] rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="badge-artistic">Green Sovereign Credits</div>
            <div className="flex items-center gap-1">
              <span className="font-editorial italic text-xs text-[#174D35] font-bold">Verified Eco Partners</span>
              {onOpenPartnerDashboard && (
                <button
                  type="button"
                  onClick={onOpenPartnerDashboard}
                  className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#E8F3EB] text-[#174D35] hover:bg-[#3FA66B] hover:text-[#FFFFFF] border border-[#DCE5DE] transition-all"
                >
                  Partner Portal
                </button>
              )}
            </div>
          </div>

          <h1 className="font-editorial italic text-3xl font-bold text-[#172019] tracking-tight mt-1">
            Eco Rewards & Vouchers
          </h1>
          <p className="text-xs text-[#65736A] leading-relaxed">
            Redeem your verified waste segregation and doorstep pickup credits for authentic partner vouchers, food discounts, student passes, and eco-friendly products!
          </p>

          {/* User Credits Card */}
          <div className="mt-3 p-4 rounded-xl bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#174D35] font-bold">
                Available Eco Balance
              </span>
              <div className="font-editorial text-3xl font-bold text-[#172019] mt-0.5 flex items-baseline gap-1.5">
                {effectivePoints}
                <span className="font-sans text-xs font-semibold text-[#3FA66B]">Eco Credits</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistoryModal(true)}
                className="h-9 px-3 rounded-full bg-[#FFFFFF] text-[#172019] border border-[#DCE5DE] font-bold text-xs hover:bg-[#F5F8F4] active:scale-95 transition-all flex items-center gap-1 shadow-2xs"
                type="button"
                title="View Credit History"
              >
                <span className="material-symbols-outlined text-[17px] text-[#3FA66B]">history</span>
                <span>History</span>
              </button>

              <button
                onClick={onOpenCertificate}
                className="h-9 px-3.5 rounded-full bg-[#3FA66B] text-[#FFFFFF] font-bold text-xs hover:bg-[#174D35] active:scale-95 transition-all flex items-center gap-1.5 shadow-xs"
                type="button"
              >
                <span className="material-symbols-outlined text-[17px]">workspace_premium</span>
                <span>Certificate</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Partner Category Tabs Horizontal Scroll */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 -mx-4 px-4">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? 'bg-[#3FA66B] text-[#FFFFFF] shadow-xs font-bold'
                  : 'bg-[#FFFFFF] text-[#172019] hover:bg-[#E8F3EB] border border-[#DCE5DE]'
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
            <h2 className="text-xs uppercase tracking-widest text-[#174D35] font-bold">
              My Redeemed Vouchers ({safeClaimedRedemptions.length})
            </h2>
          </div>

          {safeClaimedRedemptions.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#DCE5DE] flex flex-col items-center justify-center text-center gap-2">
              <div className="w-12 h-12 rounded-full bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-center text-[#3FA66B]">
                <span className="material-symbols-outlined text-[24px]">receipt_long</span>
              </div>
              <h3 className="text-sm font-bold text-[#172019]">No Claimed Vouchers Yet</h3>
              <p className="text-xs text-[#65736A] max-w-xs">
                You haven&apos;t redeemed any vouchers yet. Complete doorstep waste pickups to earn Eco Credits and redeem partner vouchers!
              </p>
              <button
                onClick={() => setSelectedCategory('all')}
                className="mt-2 px-4 py-2 rounded-xl bg-[#3FA66B] text-[#FFFFFF] text-xs font-bold"
                type="button"
              >
                Browse Available Rewards
              </button>
            </div>
          ) : (
            safeClaimedRedemptions.map((claim) => (
              <div
                key={claim.id}
                className="rounded-2xl bg-[#FFFFFF] p-4 border border-[#DCE5DE] shadow-xs flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#174D35]">
                      {claim.partner_name || 'Eco Partner'} • {claim.discount_value || 'Voucher'}
                    </span>
                    <h4 className="text-sm font-bold text-[#172019] mt-0.5">{claim.reward_title || 'Partner Reward'}</h4>
                    <span className="text-[11px] text-[#65736A]">Claimed on {claim.redemption_date || claim.redeemed_at || 'Recently'}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    claim.redemption_status === 'USED' || claim.status === 'USED'
                      ? 'bg-[#F5F8F4] text-[#65736A] border-[#DCE5DE]'
                      : 'bg-[#E8F3EB] text-[#174D35] border-[#DCE5DE]'
                  }`}>
                    {claim.redemption_status === 'USED' || claim.status === 'USED' ? 'Redeemed On-Spot' : 'Active Voucher'}
                  </span>
                </div>

                {/* Voucher Code Box */}
                <div className="p-3 rounded-xl bg-[#F5F8F4] border border-[#DCE5DE] flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-wider text-[#65736A]">Voucher Code</span>
                    <span className="font-mono text-base font-bold text-[#3FA66B] tracking-wider select-all">
                      {claim.voucher_code || claim.redemption_code}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyCode(claim.voucher_code || claim.redemption_code || '')}
                    className="px-3 py-1.5 rounded-lg bg-[#3FA66B] text-[#FFFFFF] text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[15px]">content_copy</span>
                    <span>Copy</span>
                  </button>
                </div>

                <div className="text-[11px] text-[#65736A] bg-[#F5F8F4] p-2.5 rounded-lg border border-[#DCE5DE]">
                  <strong className="text-[#172019]">How to use:</strong> {claim.redemption_instructions || claim.how_to_redeem || 'Present this code at partner checkout.'}
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
            <h2 className="text-xs uppercase tracking-widest text-[#174D35] font-bold">
              Available Partner Rewards ({filteredRewards.length})
            </h2>
            <span className="text-[11px] text-[#65736A]">Instant Verified Delivery</span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[#65736A]">
              <span className="w-6 h-6 border-2 border-[#3FA66B] border-t-transparent rounded-full animate-spin"></span>
              <span>Loading rewards...</span>
            </div>
          ) : error ? (
            <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#DCE5DE] flex flex-col items-center justify-center text-center gap-3 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                <span className="material-symbols-outlined text-[24px]">error_outline</span>
              </div>
              <h3 className="text-sm font-bold text-[#172019]">Unable to load rewards.</h3>
              <p className="text-xs text-[#65736A] max-w-xs">{error}</p>
              <button
                onClick={loadRewardsAndPartners}
                className="mt-2 px-4 py-2 rounded-xl bg-[#3FA66B] text-[#FFFFFF] text-xs font-bold hover:bg-[#174D35] transition-colors"
                type="button"
              >
                Try Again
              </button>
            </div>
          ) : filteredRewards.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#DCE5DE] flex flex-col items-center justify-center text-center gap-3 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-center text-[#3FA66B]">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <h3 className="text-sm font-bold text-[#172019]">No rewards available right now.</h3>
              <p className="text-xs text-[#65736A] max-w-xs leading-relaxed">
                We are actively onboarding genuine verified EcoScan sustainability partners! Check back soon or earn more Eco Credits.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredRewards.map((reward) => {
                const canAfford = effectivePoints >= reward.credits_required;
                const partnerObj = safeDbPartners.find((p) => p.id === reward.partner_id);

                return (
                  <div
                    key={reward.id}
                    className="rounded-2xl bg-[#FFFFFF] p-4 border border-[#DCE5DE] shadow-xs flex flex-col gap-3 hover:border-[#3FA66B]/50 transition-all relative overflow-hidden"
                  >
                    {/* Top Partner Badge & Sponsored Tag */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-[#3FA66B]">
                          verified
                        </span>
                        <span className="text-xs font-bold text-[#172019]">
                          {reward.partner_name || 'EcoScan Partner'}
                        </span>
                        {partnerObj?.city_availability && (
                          <span className="text-[9px] font-bold text-[#174D35] bg-[#E8F3EB] px-1.5 py-0.2 rounded border border-[#DCE5DE]">
                            {partnerObj.city_availability}
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          reward.sponsored_type === 'sponsored'
                            ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                            : reward.sponsored_type === 'partner'
                            ? 'bg-[#E8F3EB] text-[#174D35] border-[#DCE5DE]'
                            : 'bg-[#F5F8F4] text-[#65736A] border-[#DCE5DE]'
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
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#E8F3EB] text-[#174D35] border border-[#DCE5DE]">
                            {reward.discount_value || 'Voucher'}
                          </span>
                          <span className="text-[10px] text-[#65736A] uppercase font-semibold">
                            {(reward.voucher_type || 'discount').replace('_', ' ')}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-[#172019] mt-1 line-clamp-1">
                          {reward.title}
                        </h3>
                        <p className="text-xs text-[#65736A] mt-1 line-clamp-2 leading-relaxed">
                          {reward.description}
                        </p>
                      </div>

                      <div className="flex flex-col items-end shrink-0 pl-1">
                        <span className="font-editorial text-xl font-bold text-[#3FA66B]">
                          {reward.credits_required}
                        </span>
                        <span className="text-[10px] text-[#65736A] -mt-1">Eco Credits</span>
                      </div>
                    </div>

                    {/* Terms & Action Footer */}
                    <div className="pt-2 border-t border-[#DCE5DE] flex items-center justify-between gap-2">
                      <span className="text-[10px] text-[#65736A] truncate flex-1">
                        {reward.terms || 'Standard terms apply.'}
                      </span>

                      <button
                        onClick={() => handleRedeemClick(reward)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shrink-0 ${
                          canAfford
                            ? 'bg-[#3FA66B] text-[#FFFFFF] hover:bg-[#174D35] shadow-xs'
                            : 'bg-[#FFFFFF] text-[#65736A] border border-[#DCE5DE] hover:text-[#172019]'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172019]/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#FFFFFF] border border-[#DCE5DE] p-6 shadow-xl flex flex-col gap-4 relative text-[#172019]">
            <button
              onClick={() => {
                setActiveRewardModal(null);
                setUnlockedRedemption(null);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#FFFFFF] border border-[#DCE5DE] flex items-center justify-center text-[#65736A] hover:text-[#172019]"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>

            {!unlockedRedemption ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#E8F3EB] border border-[#3FA66B] flex items-center justify-center text-[#3FA66B]">
                    <span className="material-symbols-outlined text-[28px]">redeem</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#174D35]">
                      Confirm Partner Offer Claim
                    </span>
                    <h3 className="text-base font-bold text-[#172019]">
                      {activeRewardModal.partner_name} ({activeRewardModal.discount_value})
                    </h3>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F5F8F4] border border-[#DCE5DE] flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#65736A]">Voucher credit cost:</span>
                    <span className="font-bold text-[#3FA66B]">{activeRewardModal.credits_required} Eco Credits</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#65736A]">Current Eco Balance:</span>
                    <span className="font-bold text-[#172019]">{effectivePoints} Eco Credits</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-[#DCE5DE]">
                    <span className="text-[#65736A]">Balance after redemption:</span>
                    <span className="font-bold text-[#172019]">
                      {Math.max(0, effectivePoints - activeRewardModal.credits_required)} Eco Credits
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-[#65736A] leading-relaxed">
                  {activeRewardModal.terms}
                </p>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setActiveRewardModal(null)}
                    className="flex-1 py-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F5F8F4] text-[#172019] text-xs font-semibold border border-[#DCE5DE]"
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={redeeming}
                    onClick={() => handleConfirmRedeem(activeRewardModal)}
                    className="flex-1 py-2.5 rounded-xl bg-[#3FA66B] hover:bg-[#174D35] text-[#FFFFFF] text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all disabled:opacity-50"
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
                  <div className="w-14 h-14 rounded-full bg-[#E8F3EB] border border-[#3FA66B] flex items-center justify-center text-[#3FA66B]">
                    <span className="material-symbols-outlined text-[32px]">check_circle</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#172019]">Voucher Unlocked! 🎉</h3>
                  <p className="text-xs text-[#65736A]">
                    Here is your exclusive {unlockedRedemption.partner_name || 'partner'} digital voucher code:
                  </p>
                </div>

                {/* Code display with copy */}
                <div className="p-4 rounded-2xl bg-[#E8F3EB] border-2 border-dashed border-[#3FA66B]/70 flex flex-col items-center gap-2.5">
                  <span className="text-[10px] uppercase tracking-widest text-[#174D35] font-bold">
                    YOUR REDEMPTION CODE
                  </span>
                  <span className="font-mono text-xl font-extrabold text-[#172019] tracking-wider select-all">
                    {unlockedRedemption.redemption_code || unlockedRedemption.voucher_code}
                  </span>
                  <button
                    onClick={() => handleCopyCode(unlockedRedemption.redemption_code || unlockedRedemption.voucher_code || '')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all ${
                      copiedCode
                        ? 'bg-[#16A34A] text-[#FFFFFF]'
                        : 'bg-[#3FA66B] text-[#FFFFFF]'
                    }`}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {copiedCode ? 'done' : 'content_copy'}
                    </span>
                    <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy Code'}</span>
                  </button>
                </div>

                <div className="text-[11px] text-[#65736A] bg-[#F5F8F4] p-3 rounded-xl border border-[#DCE5DE]">
                  <strong className="text-[#172019]">How to redeem:</strong>
                  <p className="mt-1">{unlockedRedemption.how_to_redeem || unlockedRedemption.redemption_instructions || 'Present code at partner checkout.'}</p>
                </div>

                <button
                  onClick={() => {
                    setActiveRewardModal(null);
                    setUnlockedRedemption(null);
                    setSelectedCategory('claimed');
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F5F8F4] text-[#172019] text-xs font-bold border border-[#DCE5DE]"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172019]/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#FFFFFF] border border-[#DCE5DE] p-6 shadow-xl flex flex-col gap-4 relative max-h-[85vh] overflow-y-auto text-[#172019]">
            <div className="flex items-center justify-between pb-2 border-b border-[#DCE5DE]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#3FA66B] text-[22px]">history</span>
                <h3 className="text-base font-bold text-[#172019]">Eco Credit Audit Log</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-[#F5F8F4] border border-[#DCE5DE] flex items-center justify-center text-[#65736A] hover:text-[#172019]"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-xs text-[#65736A]">
              Transparent record of all Eco Credits earned from verified scrap recycling and spent on partner rewards:
            </p>

            <div className="flex flex-col gap-2">
              {safeCreditHistory.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#65736A]">No transactions recorded yet</div>
              ) : (
                safeCreditHistory.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 rounded-xl bg-[#F5F8F4] border border-[#DCE5DE] flex items-center justify-between"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#172019]">{tx.source}</span>
                      <span className="text-[10px] text-[#65736A]">
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
                        tx.type === 'EARNED' ? 'text-[#3FA66B]' : 'text-[#DC2626]'
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
