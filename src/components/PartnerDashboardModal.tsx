import React, { useState, useEffect } from 'react';
import { DbPartner, PartnerDashboardData } from '../types';
import { api } from '../services/api';
import { CollectorAvatar } from './CollectorAvatar';

interface PartnerDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerId?: string;
}

export const PartnerDashboardModal: React.FC<PartnerDashboardModalProps> = ({
  isOpen,
  onClose,
  partnerId = 'part-1',
}) => {
  const [partnersList, setPartnersList] = useState<DbPartner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(partnerId);
  const [dashboardData, setDashboardData] = useState<PartnerDashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  // Verification state
  const [verifyCodeInput, setVerifyCodeInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Offer Creation State
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCredits, setNewCredits] = useState('150');
  const [newDiscount, setNewDiscount] = useState('₹100 OFF');
  const [newCategory, setNewCategory] = useState<'food' | 'shopping' | 'entertainment' | 'student' | 'travel' | 'eco' | 'local'>('food');

  const loadData = async () => {
    try {
      setLoading(true);
      const [allPartners, dashData] = await Promise.all([
        api.getPartners(),
        api.getPartnerDashboard(selectedPartnerId).catch(() => null),
      ]);
      setPartnersList(allPartners);
      setDashboardData(dashData);
    } catch (err) {
      console.error('Error loading partner dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, selectedPartnerId]);

  if (!isOpen) return null;

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCodeInput.trim()) return;

    try {
      setVerifying(true);
      setVerifyResult(null);
      const res = await api.verifyRedemptionCode(verifyCodeInput, selectedPartnerId);
      setVerifyResult({ success: res.success, message: res.message });
      if (res.success) {
        setVerifyCodeInput('');
        loadData();
      }
    } catch (err: any) {
      setVerifyResult({ success: false, message: err.message || 'Verification failed' });
    } finally {
      setVerifying(false);
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newCredits) {
      alert('Title and Eco Credits are required');
      return;
    }

    try {
      await api.addReward({
        partner_id: selectedPartnerId,
        partner_name: dashboardData?.partner.partner_name || 'EcoScan Partner',
        title: newTitle,
        description: newDesc,
        reward_category: newCategory,
        credits_required: Number(newCredits),
        discount_value: newDiscount,
        voucher_type: 'discount',
        terms: 'Show digital voucher at counter or online checkout',
        expiry_date: '31/12/2026',
        stock: 50,
        active: true,
        sponsored_type: 'partner',
        city_scope: dashboardData?.partner.city_availability || 'Hyderabad',
      });
      alert('New partner reward offer created successfully!');
      setShowAddOffer(false);
      setNewTitle('');
      setNewDesc('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create offer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172019]/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-[#FFFFFF] text-[#172019] rounded-3xl p-6 shadow-2xl flex flex-col gap-5 border border-[#DCE5DE] max-h-[90vh] overflow-y-auto">
        {/* Header & Partner Selector */}
        <div className="flex items-center justify-between pb-3 border-b border-[#DCE5DE]">
          <div className="flex items-center gap-3">
            <CollectorAvatar
              name={dashboardData?.partner.partner_name || 'Raju Kumar (Green Earth Kabadiwala Hub)'}
              size="lg"
              showVerifiedBadge={true}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="badge-artistic">Partner Portal</span>
                <span className="text-[10px] font-bold text-[#174D35] bg-[#E8F3EB] px-2 py-0.5 rounded border border-[#DCE5DE]">
                  {dashboardData?.partner.partnership_status || 'Active Partner'}
                </span>
              </div>
              <h3 className="font-editorial text-xl font-bold text-[#172019] mt-0.5">
                {dashboardData?.partner.partner_name || 'Partner Dashboard'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#F5F8F4] border border-[#DCE5DE] flex items-center justify-center text-[#65736A] hover:text-[#172019]"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Switch Partner (Demo Selector) */}
        {partnersList.length > 0 && (
          <div className="p-3 rounded-xl bg-[#F5F8F4] border border-[#DCE5DE] flex items-center justify-between gap-3 text-xs">
            <span className="font-bold text-[#174D35]">Switch Active Partner Account:</span>
            <select
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#DCE5DE] text-[#172019] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[#3FA66B]"
            >
              {partnersList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.partner_name} ({p.city_availability})
                </option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[#65736A]">
            <span className="w-6 h-6 border-2 border-[#3FA66B] border-t-transparent rounded-full animate-spin"></span>
            <span>Loading Partner Portal Analytics...</span>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#E8F3EB] border border-[#DCE5DE] flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-[#174D35]">Total Redemptions</span>
                <span className="font-editorial text-2xl font-bold text-[#172019]">
                  {dashboardData?.totalRedemptions || 0}
                </span>
                <span className="text-[10px] text-[#65736A]">Vouchers claimed</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F5F8F4] border border-[#DCE5DE] flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-[#174D35]">Used / Verified</span>
                <span className="font-editorial text-2xl font-bold text-[#3FA66B]">
                  {dashboardData?.usedVouchers || 0}
                </span>
                <span className="text-[10px] text-[#65736A]">Counter verified</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F5F8F4] border border-[#DCE5DE] flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-[#174D35]">Credits Redeemed</span>
                <span className="font-editorial text-2xl font-bold text-[#172019]">
                  {dashboardData?.creditsRedeemed || 0}
                </span>
                <span className="text-[10px] text-[#65736A]">Eco credits value</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F5F8F4] border border-[#DCE5DE] flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-[#174D35]">Active Offers</span>
                <span className="font-editorial text-2xl font-bold text-[#172019]">
                  {dashboardData?.rewards.length || 0}
                </span>
                <span className="text-[10px] text-[#65736A]">Live catalog</span>
              </div>
            </div>

            {/* Verification Tool Box */}
            <div className="p-4 rounded-2xl bg-[#FFFFFF] border-2 border-dashed border-[#3FA66B] flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#3FA66B]">qr_code_scanner</span>
                <h4 className="text-sm font-bold text-[#172019]">Verify Customer Voucher Code (On Spot Counter Verification)</h4>
              </div>

              <form onSubmit={handleVerifyCode} className="flex items-center gap-2">
                <input
                  type="text"
                  value={verifyCodeInput}
                  onChange={(e) => setVerifyCodeInput(e.target.value.toUpperCase())}
                  placeholder="Enter Redemption Code (e.g. SWAC-482910)"
                  className="flex-1 h-11 px-3.5 rounded-xl bg-[#F5F8F4] border border-[#DCE5DE] font-mono text-sm font-bold placeholder:font-sans placeholder:text-xs placeholder:text-[#65736A] focus:outline-none focus:ring-2 focus:ring-[#3FA66B]"
                />
                <button
                  type="submit"
                  disabled={verifying || !verifyCodeInput.trim()}
                  className="h-11 px-5 rounded-xl bg-[#3FA66B] hover:bg-[#174D35] text-[#FFFFFF] font-bold text-xs shadow-xs active:scale-95 transition-all disabled:opacity-50"
                >
                  {verifying ? 'Verifying...' : 'Verify Code'}
                </button>
              </form>

              {verifyResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    verifyResult.success
                      ? 'bg-[#E8F3EB] text-[#174D35] border border-[#3FA66B]'
                      : 'bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {verifyResult.success ? 'check_circle' : 'error'}
                  </span>
                  <span>{verifyResult.message}</span>
                </div>
              )}
            </div>

            {/* Active Offers Section */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs uppercase tracking-widest text-[#174D35] font-bold">
                  My Live Offers ({dashboardData?.rewards.length || 0})
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddOffer(!showAddOffer)}
                  className="px-3 py-1.5 rounded-xl bg-[#3FA66B] text-[#FFFFFF] font-bold text-xs hover:bg-[#174D35] flex items-center gap-1 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>{showAddOffer ? 'Close Form' : 'Create Offer'}</span>
                </button>
              </div>

              {/* Add Offer Form */}
              {showAddOffer && (
                <form onSubmit={handleCreateOffer} className="p-4 rounded-2xl bg-[#F5F8F4] border border-[#DCE5DE] flex flex-col gap-3">
                  <h5 className="text-xs font-bold text-[#172019]">Create New Partner Offer</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="Offer Title (e.g. ₹100 Off Organic Meal)"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] text-xs font-medium"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Discount / Value Text (e.g. ₹100 OFF)"
                      value={newDiscount}
                      onChange={(e) => setNewDiscount(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] text-xs font-medium"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Eco Credits Required (e.g. 150)"
                      value={newCredits}
                      onChange={(e) => setNewCredits(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] text-xs font-medium"
                      required
                    />
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] text-xs font-medium"
                    >
                      <option value="food">Food & Dining</option>
                      <option value="shopping">Shopping</option>
                      <option value="entertainment">Entertainment</option>
                      <option value="student">Student Benefits</option>
                      <option value="travel">Travel & Lifestyle</option>
                      <option value="eco">Eco-Friendly Brands</option>
                      <option value="local">Local Hyderabad</option>
                    </select>
                  </div>
                  <textarea
                    placeholder="Offer Description & Terms..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] text-xs font-medium h-16"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#3FA66B] hover:bg-[#174D35] text-[#FFFFFF] text-xs font-bold transition-all"
                  >
                    Publish Offer to EcoScan Catalog
                  </button>
                </form>
              )}

              {/* Offer Cards */}
              <div className="flex flex-col gap-2">
                {dashboardData?.rewards.map((rew) => (
                  <div key={rew.id} className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#172019]">{rew.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8F3EB] text-[#174D35]">
                          {rew.discount_value}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#65736A] mt-0.5">{rew.description}</span>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className="font-bold text-xs text-[#3FA66B]">{rew.credits_required} Credits</span>
                      <span className="text-[10px] text-[#65736A]">Stock: {rew.stock}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Redemptions Log */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs uppercase tracking-widest text-[#174D35] font-bold">
                Customer Redemptions History ({dashboardData?.redemptions.length || 0})
              </h4>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                {dashboardData?.redemptions.map((red) => (
                  <div key={red.id} className="p-2.5 rounded-xl bg-[#F5F8F4] border border-[#DCE5DE] flex items-center justify-between text-xs">
                    <div className="flex flex-col">
                      <span className="font-mono font-bold text-[#172019]">{red.redemption_code}</span>
                      <span className="text-[10px] text-[#65736A]">{red.reward_title} • {red.redemption_date}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      red.redemption_status === 'USED'
                        ? 'bg-[#D1FAE5] text-[#065F46]'
                        : 'bg-[#FEF3C7] text-[#92400E]'
                    }`}>
                      {red.redemption_status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
