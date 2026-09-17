import React, { useState, useEffect, useMemo } from 'react';
import {
  AdminStatsData,
  DbCollectorItem,
  DbWasteMaterialItem,
  AuthUser,
  DbPickupItem,
  DbPartner,
  DbRewardItem,
  DbRewardRedemption,
  PartnershipStatus,
  PartnerCategory,
  ServiceAreaScope,
  RewardCategory,
  SponsoredType,
} from '../types';
import { api } from '../services/api';
import { CollectorAvatar } from '../components/CollectorAvatar';
import { useI18n } from '../i18n';

interface AdminDashboardProps {
  onRefresh?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onRefresh }) => {
  const { t } = useI18n();
  const [stats, setStats] = useState<AdminStatsData | null>(null);
  const [collectors, setCollectors] = useState<DbCollectorItem[]>([]);
  const [materials, setMaterials] = useState<DbWasteMaterialItem[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [pickups, setPickups] = useState<DbPickupItem[]>([]);
  const [partners, setPartners] = useState<DbPartner[]>([]);
  const [rewards, setRewards] = useState<DbRewardItem[]>([]);
  const [redemptions, setRedemptions] = useState<DbRewardRedemption[]>([]);

  const [activeTab, setActiveTab] = useState<'overview' | 'collectors' | 'materials' | 'users' | 'audit' | 'partners'>('overview');
  const [partnerSubTab, setPartnerSubTab] = useState<'pipeline' | 'rewards' | 'redemptions'>('pipeline');

  const uniquePickups = useMemo(() => {
    const seen = new Set<string>();
    return pickups.filter((p) => {
      if (!p || !p.id || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [pickups]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Material edit state
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editPriceInput, setEditPriceInput] = useState<string>('');

  // Add material modal state
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [newMatName, setNewMatName] = useState('');
  const [newMatCategory, setNewMatCategory] = useState('Plastic');
  const [newMatPrice, setNewMatPrice] = useState('25');

  // Collector creation modal state
  const [showAddCollector, setShowAddCollector] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColPhone, setNewColPhone] = useState('');
  const [newColArea, setNewColArea] = useState('Jubilee Hills, Banjara Hills, Hyderabad');
  const [newColStatus, setNewColStatus] = useState<'VERIFIED' | 'PENDING'>('VERIFIED');

  // Partner creation modal state
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerCategory, setNewPartnerCategory] = useState<PartnerCategory>('Food & Dining');
  const [newPartnerScope, setNewPartnerScope] = useState<ServiceAreaScope>('Hyderabad');
  const [newPartnerStatus, setNewPartnerStatus] = useState<PartnershipStatus>('Active');
  const [newPartnerDiscount, setNewPartnerDiscount] = useState('20% OFF');
  const [newPartnerContact, setNewPartnerContact] = useState('');
  const [newPartnerDesc, setNewPartnerDesc] = useState('');
  const [newPartnerVerified, setNewPartnerVerified] = useState(true);

  // Reward creation modal state
  const [showAddReward, setShowAddReward] = useState(false);
  const [newRewardPartnerId, setNewRewardPartnerId] = useState('');
  const [newRewardTitle, setNewRewardTitle] = useState('');
  const [newRewardDesc, setNewRewardDesc] = useState('');
  const [newRewardDiscount, setNewRewardDiscount] = useState('₹100 OFF');
  const [newRewardCredits, setNewRewardCredits] = useState('150');
  const [newRewardCategory, setNewRewardCategory] = useState<RewardCategory>('food');
  const [newRewardSponsored, setNewRewardSponsored] = useState<SponsoredType>('partner');
  const [newRewardStock, setNewRewardStock] = useState('100');

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        adminStats,
        allCollectors,
        allMaterials,
        allUsers,
        allPickups,
        allPartners,
        allRewards,
        allRedemptions,
      ] = await Promise.all([
        api.getAdminStats(),
        api.getCollectors(),
        api.getMaterials(),
        api.getUsers(),
        api.getPickups(),
        api.getPartners(),
        api.getRewards(),
        api.getRedemptions(),
      ]);
      setStats(adminStats);
      setCollectors(allCollectors);
      setMaterials(allMaterials);
      setUsers(allUsers);
      setPickups(allPickups);
      setPartners(allPartners);
      setRewards(allRewards);
      setRedemptions(allRedemptions);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleVerifyCollector = async (
    id: string,
    status: 'VERIFIED' | 'REJECTED' | 'SUSPENDED' | 'PENDING'
  ) => {
    try {
      setActionLoading(id);
      await api.verifyCollector(id, status);
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update collector status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddCollectorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim() || !newColPhone.trim()) {
      alert('Please enter business name and phone number');
      return;
    }
    try {
      setActionLoading('new_collector');
      await api.addCollector({
        name: newColName.trim(),
        phone: newColPhone.trim(),
        service_area: newColArea.trim() || 'Hyderabad Central',
        verification_status: newColStatus,
      });
      setShowAddCollector(false);
      setNewColName('');
      setNewColPhone('');
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to add collector');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSeedDefaultCollectorsSubmit = async () => {
    try {
      setActionLoading('seed_collectors');
      await api.seedDefaultCollectors();
      await loadData();
      if (onRefresh) onRefresh();
      alert('Default Hyderabad scrap partners seeded successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to seed collectors');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveAllPendingCollectors = async () => {
    try {
      setActionLoading('approve_all');
      const pendingCols = collectors.filter((c) => c.verification_status === 'PENDING');
      for (const c of pendingCols) {
        await api.verifyCollector(c.id, 'VERIFIED');
      }
      const unlinked = users.filter((u) => u.role === 'collector' && !collectors.some((c) => c.user_id === u.id));
      for (const u of unlinked) {
        await api.addCollector({
          name: u.name,
          phone: u.phone || '+91 90000 00000',
          user_id: u.id,
          verification_status: 'VERIFIED',
        });
      }
      await loadData();
      if (onRefresh) onRefresh();
      alert('All pending kabadiwalas/collectors have been approved and verified!');
    } catch (err: any) {
      alert(err.message || 'Failed to approve collectors');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePartnerStatusChange = async (
    partnerId: string,
    status: PartnershipStatus,
    verified?: boolean
  ) => {
    try {
      setActionLoading(partnerId);
      await api.updatePartnerStatus(partnerId, status, verified);
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update partner status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddPartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartnerName.trim()) {
      alert('Please enter partner business name');
      return;
    }
    try {
      setActionLoading('new_partner');
      await api.createPartner({
        name: newPartnerName.trim(),
        category: newPartnerCategory,
        city_scope: newPartnerScope,
        partnership_status: newPartnerStatus,
        verified_badge: newPartnerVerified,
        discount_highlight: newPartnerDiscount,
        contact_email: newPartnerContact,
        description: newPartnerDesc || `${newPartnerName} eco reward partner.`,
      });
      setShowAddPartner(false);
      setNewPartnerName('');
      setNewPartnerContact('');
      setNewPartnerDesc('');
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to add partner');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddRewardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRewardTitle.trim() || !newRewardCredits) {
      alert('Please fill reward title and credit amount');
      return;
    }
    try {
      setActionLoading('new_reward');
      const selectedPartner = partners.find((p) => p.id === newRewardPartnerId);
      await api.addReward({
        partner_id: newRewardPartnerId || (partners[0]?.id || 'part-1'),
        partner_name: selectedPartner?.name || 'EcoScan Partner',
        partner_logo: selectedPartner?.logo_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&auto=format&fit=crop&q=60',
        reward_title: newRewardTitle.trim(),
        reward_description: newRewardDesc || 'Exclusive eco reward coupon.',
        discount_value: newRewardDiscount,
        credits_required: parseInt(newRewardCredits) || 100,
        reward_category: newRewardCategory,
        sponsored_type: newRewardSponsored,
        city_scope: selectedPartner?.city_scope || 'Hyderabad',
        stock_remaining: parseInt(newRewardStock) || 50,
        is_active: true,
      });
      setShowAddReward(false);
      setNewRewardTitle('');
      setNewRewardDesc('');
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create reward');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveMaterialPrice = async (materialId: string) => {
    const price = parseFloat(editPriceInput);
    if (isNaN(price) || price < 0) {
      alert('Please enter a valid scrap price');
      return;
    }
    try {
      setActionLoading(materialId);
      await api.updateMaterial(materialId, { current_price_per_kg: price });
      setEditingMaterialId(null);
      setEditPriceInput('');
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update material price');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatName.trim() || !newMatPrice) {
      alert('Please provide name and price');
      return;
    }
    try {
      await api.addMaterial({
        material_name: newMatName.trim(),
        category: newMatCategory as any,
        current_price_per_kg: parseFloat(newMatPrice),
        unit: '₹/kg',
        recyclable: true,
        disposal_instruction: 'Segregate cleanly for kabadiwala scrap collection.',
      });
      setShowAddMaterial(false);
      setNewMatName('');
      setNewMatPrice('25');
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to add material');
    }
  };

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto px-4 sm:px-6 gap-6 pt-2 pb-24 text-[#12352A]">
      {/* 1. Header Banner */}
      <div className="w-full rounded-3xl bg-[#FFFFFF] p-6 shadow-sm border border-[#D8EADF] relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F8EE] flex items-center justify-center text-[#16A765] border border-[#D8EADF] shadow-sm">
              <span className="material-symbols-outlined text-[28px]">admin_panel_settings</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#12352A] tracking-tight">{t('adminDeskHeader')}</h1>
              <p className="text-xs text-[#60766C] mt-0.5">{t('adminSubHeader')}</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[#E8F8EE] text-[#16A765] border border-[#D8EADF] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#16A765] animate-pulse"></span>
            {t('systemOnline')}
          </span>
        </div>
      </div>

      {/* 2. Top Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
          <span className="text-[11px] uppercase font-bold text-[#60766C] tracking-wider">
            {t('totalRecycled')}
          </span>
          <span className="text-xl font-extrabold text-[#12352A] mt-1.5">
            {stats?.totalWasteRecycled || 0} <span className="text-xs font-semibold text-[#16A765]">kg</span>
          </span>
          <span className="text-xs text-[#60766C] mt-1">{t('divertedLandfill')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
          <span className="text-[11px] uppercase font-bold text-[#60766C] tracking-wider">
            {t('payoutSettled')}
          </span>
          <span className="text-xl font-extrabold text-[#12352A] mt-1.5">
            ₹{stats?.totalTransactionValue?.toLocaleString() || 0}
          </span>
          <span className="text-xs text-[#16A765] font-semibold mt-1">{t('toCitizens')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
          <span className="text-[11px] uppercase font-bold text-[#60766C] tracking-wider">
            {t('pickupsDone')}
          </span>
          <span className="text-xl font-extrabold text-[#12352A] mt-1.5">
            {stats?.completedPickups || 0} / {stats?.totalPickups || 0}
          </span>
          <span className="text-xs text-[#60766C] mt-1">{t('completedRate')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
          <span className="text-[11px] uppercase font-bold text-[#60766C] tracking-wider">
            {t('collectorsCap')}
          </span>
          <span className="text-xl font-extrabold text-[#12352A] mt-1.5">
            {stats?.verifiedCollectors || 0} / {stats?.totalCollectors || 0}
          </span>
          <span className="text-xs text-[#16A765] font-semibold mt-1">{t('verified')}</span>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="w-full bg-[#F3FBF6] p-1.5 rounded-2xl border border-[#D8EADF] shadow-sm flex items-center overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 min-w-[75px] py-2 px-3 rounded-xl text-xs font-bold transition-all text-center ${
            activeTab === 'overview'
              ? 'bg-[#16A765] text-[#FFFFFF] shadow-sm'
              : 'text-[#60766C] hover:text-[#12352A] hover:bg-[#FFFFFF]/60'
          }`}
          type="button"
        >
          {t('overview')}
        </button>

        <button
          onClick={() => setActiveTab('collectors')}
          className={`flex-1 min-w-[75px] py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
            activeTab === 'collectors'
              ? 'bg-[#16A765] text-[#FFFFFF] shadow-sm'
              : 'text-[#60766C] hover:text-[#12352A] hover:bg-[#FFFFFF]/60'
          }`}
          type="button"
        >
          <span>{t('collectorsTab')}</span>
          {collectors.filter((c) => c.verification_status === 'PENDING').length > 0 && (
            <span className="w-2 h-2 rounded-full bg-[#D97706]"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('materials')}
          className={`flex-1 min-w-[75px] py-2 px-3 rounded-xl text-xs font-bold transition-all text-center ${
            activeTab === 'materials'
              ? 'bg-[#16A765] text-[#FFFFFF] shadow-sm'
              : 'text-[#60766C] hover:text-[#12352A] hover:bg-[#FFFFFF]/60'
          }`}
          type="button"
        >
          {t('scrapPricesTab')}
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 min-w-[75px] py-2 px-3 rounded-xl text-xs font-bold transition-all text-center ${
            activeTab === 'users'
              ? 'bg-[#16A765] text-[#FFFFFF] shadow-sm'
              : 'text-[#60766C] hover:text-[#12352A] hover:bg-[#FFFFFF]/60'
          }`}
          type="button"
        >
          {t('usersTab')}
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 min-w-[75px] py-2 px-3 rounded-xl text-xs font-bold transition-all text-center ${
            activeTab === 'audit'
              ? 'bg-[#16A765] text-[#FFFFFF] shadow-sm'
              : 'text-[#60766C] hover:text-[#12352A] hover:bg-[#FFFFFF]/60'
          }`}
          type="button"
        >
          {t('auditLogTab')}
        </button>

        <button
          onClick={() => setActiveTab('partners')}
          className={`flex-1 min-w-[75px] py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
            activeTab === 'partners'
              ? 'bg-[#16A765] text-[#FFFFFF] shadow-sm'
              : 'text-[#60766C] hover:text-[#12352A] hover:bg-[#FFFFFF]/60'
          }`}
          type="button"
        >
          <span>{t('partnersTab')}</span>
          {partners.filter((p) => p.partnership_status !== 'Active').length > 0 && (
            <span className="w-2 h-2 rounded-full bg-[#3B82F6]"></span>
          )}
        </button>
      </div>

      {/* 4. Tab: Overview & Analytics */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-4">
          {/* Pending Collector & User Approvals Card */}
          {(collectors.some((c) => c.verification_status === 'PENDING') ||
            users.some((u) => u.role === 'collector' && !collectors.some((c) => c.user_id === u.id))) && (
            <div className="p-5 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] flex flex-col gap-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#D97706] text-[24px]">pending_actions</span>
                  <div>
                    <h3 className="text-xs font-bold text-[#12352A] uppercase tracking-wider">
                      {t('pendingKabadiwalaApprovals')} ({collectors.filter((c) => c.verification_status === 'PENDING').length + users.filter((u) => u.role === 'collector' && !collectors.some((c) => c.user_id === u.id)).length})
                    </h3>
                    <p className="text-xs text-[#60766C] mt-0.5">{t('approvalRequiredDesc')}</p>
                  </div>
                </div>
                <button
                  onClick={handleApproveAllPendingCollectors}
                  disabled={actionLoading === 'approve_all'}
                  type="button"
                  className="px-4 py-2 rounded-xl bg-[#D97706] text-[#FFFFFF] font-bold text-xs hover:bg-[#B45309] shadow-sm transition-all shrink-0"
                >
                  {t('approveAllPending')}
                </button>
              </div>

              <div className="flex flex-col gap-2.5">
                {collectors.filter((c) => c.verification_status === 'PENDING').map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-[#FFFFFF] border border-[#FDE68A] flex items-center justify-between gap-3 shadow-xs">
                    <div>
                      <span className="text-xs font-bold text-[#12352A]">{c.name}</span>
                      <span className="text-xs text-[#60766C] block mt-0.5">{c.phone} • {c.service_area}</span>
                    </div>
                    <button
                      onClick={() => handleVerifyCollector(c.id, 'VERIFIED')}
                      disabled={actionLoading === c.id}
                      type="button"
                      className="px-3.5 py-1.5 rounded-xl bg-[#16A765] hover:bg-[#087A4B] text-[#FFFFFF] text-xs font-bold shadow-sm transition-all"
                    >
                      {t('approveAndVerify')}
                    </button>
                  </div>
                ))}

                {users.filter((u) => u.role === 'collector' && !collectors.some((c) => c.user_id === u.id)).map((u) => (
                  <div key={u.id} className="p-3 rounded-xl bg-[#FFFFFF] border border-[#FDE68A] flex items-center justify-between gap-3 shadow-xs">
                    <div>
                      <span className="text-xs font-bold text-[#12352A]">{u.name} ({u.email})</span>
                      <span className="text-xs text-[#60766C] block mt-0.5">Phone: {u.phone || 'N/A'}</span>
                    </div>
                    <button
                      onClick={() => {
                        setActionLoading(u.id);
                        api.addCollector({
                          name: u.name,
                          phone: u.phone || '+91 90000 00000',
                          user_id: u.id,
                          verification_status: 'VERIFIED',
                        })
                        .then(() => loadData())
                        .catch((e) => alert(e.message))
                        .finally(() => setActionLoading(null));
                      }}
                      disabled={actionLoading === u.id}
                      type="button"
                      className="px-3.5 py-1.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-[#FFFFFF] text-xs font-bold shadow-sm transition-all"
                    >
                      Approve & Link Profile
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Waste By Category Card */}
          <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#12352A] uppercase tracking-wider">
                Waste Diverted by Category (kg)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#E8F8EE] text-[#16A765] border border-[#D8EADF]">Live Telemetry</span>
            </div>

            <div className="flex flex-col gap-3">
              {stats?.wasteByCategory && Object.keys(stats.wasteByCategory).length > 0 ? (
                Object.entries(stats.wasteByCategory).map(([cat, rawKg]) => {
                  const kg = Number(rawKg) || 0;
                  const numValues = Object.values(stats.wasteByCategory).map((v) => Number(v) || 0);
                  const maxKg = Math.max(...numValues, 10);
                  const percent = Math.min(100, Math.round((kg / maxKg) * 100));
                  return (
                    <div key={cat} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#60766C] font-medium">{cat}</span>
                        <span className="text-[#12352A] font-bold">{kg.toFixed(1)} kg</span>
                      </div>
                      <div className="w-full bg-[#F3FBF6] h-2.5 rounded-full overflow-hidden border border-[#D8EADF]">
                        <div
                          className="bg-[#16A765] h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-[#60766C]">No category breakdown recorded yet.</p>
              )}
            </div>
          </div>

          {/* Eco Credits Overview */}
          <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] uppercase font-bold text-[#60766C] tracking-wider">
                Eco Credits Issued
              </span>
              <h3 className="text-xl font-extrabold text-[#16A765] mt-1">
                {stats?.ecoCreditsIssued || 0} Credits
              </h3>
              <p className="text-xs text-[#60766C] mt-0.5">Awarded strictly once per completed pickup</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#E8F8EE] border border-[#D8EADF] flex items-center justify-center text-[#16A765] shadow-xs">
              <span className="material-symbols-outlined text-[26px]">workspace_premium</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab: Collectors Verification */}
      {activeTab === 'collectors' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-[#12352A] uppercase tracking-wider">
                Registered Scrap Partners ({collectors.length})
              </h3>
              <span className="text-xs text-[#60766C]">
                {collectors.filter((c) => c.verification_status === 'VERIFIED').length} Verified
              </span>
            </div>
            <div className="flex items-center gap-2">
              {collectors.length === 0 && (
                <button
                  onClick={handleSeedDefaultCollectorsSubmit}
                  disabled={actionLoading === 'seed_collectors'}
                  type="button"
                  className="px-3.5 py-2 rounded-xl bg-[#F3FBF6] text-[#12352A] border border-[#D8EADF] text-xs font-semibold hover:bg-[#E8F8EE] transition-all shrink-0"
                >
                  Seed Hyderabad Hubs
                </button>
              )}
              <button
                onClick={() => setShowAddCollector(!showAddCollector)}
                type="button"
                className="px-4 py-2 rounded-xl bg-[#16A765] text-[#FFFFFF] text-xs font-bold hover:bg-[#087A4B] flex items-center gap-1.5 shadow-sm transition-all shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add Scrap Partner
              </button>
            </div>
          </div>

          {/* Add Collector Modal / Form */}
          {showAddCollector && (
            <form
              onSubmit={handleAddCollectorSubmit}
              className="p-5 rounded-2xl bg-[#F3FBF6] border border-[#D8EADF] flex flex-col gap-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#12352A]">Register New Scrap Partner / Collector</span>
                <button
                  type="button"
                  onClick={() => setShowAddCollector(false)}
                  className="text-xs text-[#60766C] hover:text-[#12352A] p-1"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#60766C] block mb-1 font-semibold">Business Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Green Earth Kabadiwala Hub"
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#D8EADF] text-[#12352A] text-xs font-medium focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765] focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#60766C] block mb-1 font-semibold">Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98765 43210"
                    value={newColPhone}
                    onChange={(e) => setNewColPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#D8EADF] text-[#12352A] text-xs font-medium focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765] focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#60766C] block mb-1 font-semibold">Service Area</label>
                  <input
                    type="text"
                    placeholder="Jubilee Hills, Banjara Hills, Hyderabad"
                    value={newColArea}
                    onChange={(e) => setNewColArea(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#D8EADF] text-[#12352A] text-xs font-medium focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765] focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#60766C] block mb-1 font-semibold">Verification Status</label>
                  <select
                    value={newColStatus}
                    onChange={(e) => setNewColStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#D8EADF] text-[#12352A] text-xs font-medium focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765] focus:outline-none transition-all"
                  >
                    <option value="VERIFIED">VERIFIED (Approved)</option>
                    <option value="PENDING">PENDING (Requires Review)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="py-2.5 rounded-xl bg-[#16A765] text-[#FFFFFF] text-xs font-bold hover:bg-[#087A4B] shadow-sm transition-all"
              >
                Save & Register Scrap Partner
              </button>
            </form>
          )}

          {/* Registered User Accounts with role === 'collector' awaiting collector profile linking */}
          {users.filter((u) => u.role === 'collector' && !collectors.some((c) => c.user_id === u.id)).map((unlinkedUser) => (
            <div key={unlinkedUser.id} className="p-4 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-between gap-3 shadow-sm">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D97706] block">Registered Collector User Awaiting Approval</span>
                <h4 className="text-xs font-bold text-[#12352A] mt-0.5">{unlinkedUser.name} ({unlinkedUser.email})</h4>
                <p className="text-xs text-[#60766C] mt-0.5">Phone: {unlinkedUser.phone || 'N/A'}</p>
              </div>
              <button
                onClick={() => {
                  setActionLoading(unlinkedUser.id);
                  api.addCollector({
                    name: unlinkedUser.name,
                    phone: unlinkedUser.phone || '+91 90000 00000',
                    user_id: unlinkedUser.id,
                    verification_status: 'VERIFIED',
                  })
                  .then(() => loadData())
                  .catch((e) => alert(e.message))
                  .finally(() => setActionLoading(null));
                }}
                disabled={actionLoading === unlinkedUser.id}
                className="px-3.5 py-2 rounded-xl bg-[#D97706] text-[#FFFFFF] font-bold text-xs hover:bg-[#B45309] shadow-sm shrink-0 transition-all"
                type="button"
              >
                Approve & Link Profile
              </button>
            </div>
          ))}

          {collectors.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex flex-col items-center justify-center text-center gap-3 shadow-sm">
              <span className="material-symbols-outlined text-[40px] text-[#16A765]">local_shipping</span>
              <div>
                <h4 className="text-sm font-bold text-[#12352A]">No Scrap Partners Found</h4>
                <p className="text-xs text-[#60766C] mt-1 max-w-sm mx-auto">
                  Click "Add Scrap Partner" above or click below to populate default Hyderabad recycling depots.
                </p>
              </div>
              <button
                onClick={handleSeedDefaultCollectorsSubmit}
                disabled={actionLoading === 'seed_collectors'}
                type="button"
                className="px-4 py-2 rounded-xl bg-[#16A765] text-[#FFFFFF] text-xs font-bold hover:bg-[#087A4B] shadow-sm transition-all"
              >
                Seed Default Hyderabad Scrap Partners
              </button>
            </div>
          ) : (
            collectors.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex flex-col gap-3 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    <CollectorAvatar
                      src={c.avatar_url || c.profile_image}
                      name={c.name}
                      size="md"
                      showVerifiedBadge={true}
                      verificationStatus={c.verification_status}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-[#12352A]">{c.name}</h4>
                      </div>
                      <p className="text-xs text-[#60766C] flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[13px]">call</span>
                        {c.phone}
                      </p>
                      <p className="text-xs text-[#60766C] mt-0.5">Area: {c.service_area}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-[11px] font-semibold ${
                        c.verification_status === 'VERIFIED'
                          ? 'bg-[#E8F8EE] text-[#16A765] border border-[#D8EADF]'
                          : c.verification_status === 'PENDING'
                          ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]'
                          : 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5]'
                      }`}
                    >
                      {c.verification_status}
                    </span>
                    <span className="block text-xs text-[#60766C] mt-1 font-medium">
                      {c.total_pickups} pickups • {c.rating}★
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#D8EADF]">
                  {c.verification_status !== 'VERIFIED' && (
                    <button
                      onClick={() => handleVerifyCollector(c.id, 'VERIFIED')}
                      disabled={actionLoading === c.id}
                      type="button"
                      className="flex-1 py-1.5 rounded-xl bg-[#16A765] hover:bg-[#087A4B] text-[#FFFFFF] text-xs font-bold transition-all shadow-sm"
                    >
                      Approve & Verify
                    </button>
                  )}

                  {c.verification_status !== 'SUSPENDED' && (
                    <button
                      onClick={() => handleVerifyCollector(c.id, 'SUSPENDED')}
                      disabled={actionLoading === c.id}
                      type="button"
                      className="px-3.5 py-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#FEE2E2] text-[#DC2626] border border-[#D8EADF] text-xs font-semibold transition-all"
                    >
                      Suspend
                    </button>
                  )}

                  {c.verification_status !== 'REJECTED' && c.verification_status === 'PENDING' && (
                    <button
                      onClick={() => handleVerifyCollector(c.id, 'REJECTED')}
                      disabled={actionLoading === c.id}
                      type="button"
                      className="px-3.5 py-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#FEE2E2] text-[#DC2626] border border-[#D8EADF] text-xs font-semibold transition-all"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 6. Tab: Scrap Material Dynamic Pricing */}
      {activeTab === 'materials' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#12352A] uppercase tracking-wider">
              Dynamic Mandi Scrap Rates ({materials.length})
            </h3>
            <button
              onClick={() => setShowAddMaterial(true)}
              type="button"
              className="px-3 py-1.5 rounded-xl bg-[#16A765] text-[#FFFFFF] text-xs font-bold hover:bg-[#087A4B] flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add Material
            </button>
          </div>

          {/* Add Material Modal / Form */}
          {showAddMaterial && (
            <form
              onSubmit={handleAddMaterial}
              className="p-5 rounded-2xl bg-[#F3FBF6] border border-[#D8EADF] flex flex-col gap-3.5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#12352A]">Add New Scrap Material</span>
                <button
                  type="button"
                  onClick={() => setShowAddMaterial(false)}
                  className="text-xs text-[#60766C] hover:text-[#12352A] p-1"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#60766C] block mb-1 font-semibold">Material Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Copper Wire Grade 1"
                    value={newMatName}
                    onChange={(e) => setNewMatName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#D8EADF] text-[#12352A] text-xs font-medium focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765] focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#60766C] block mb-1 font-semibold">Category</label>
                  <select
                    value={newMatCategory}
                    onChange={(e) => setNewMatCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#D8EADF] text-[#12352A] text-xs font-medium focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765] focus:outline-none transition-all"
                  >
                    <option value="Plastic">Plastic</option>
                    <option value="Metal">Metal</option>
                    <option value="Paper">Paper</option>
                    <option value="Cardboard">Cardboard</option>
                    <option value="Glass">Glass</option>
                    <option value="E-waste">E-waste</option>
                    <option value="Textile">Textile</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[#60766C] block mb-1 font-semibold">Rate (₹/kg)</label>
                <input
                  type="number"
                  required
                  step="0.5"
                  value={newMatPrice}
                  onChange={(e) => setNewMatPrice(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#D8EADF] text-[#12352A] text-xs font-medium focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765] focus:outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                className="py-2.5 rounded-xl bg-[#16A765] text-[#FFFFFF] text-xs font-bold hover:bg-[#087A4B] shadow-sm transition-all"
              >
                Save to Scrap Database
              </button>
            </form>
          )}

          {/* List of Materials with Inline Price Editing */}
          {materials.map((m) => (
            <div
              key={m.id}
              className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex items-center justify-between gap-3 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-[#12352A]">{m.material_name}</h4>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#E8F8EE] text-[#16A765] font-semibold border border-[#D8EADF]">
                    {m.category}
                  </span>
                </div>
                <p className="text-xs text-[#60766C] mt-1 line-clamp-1">
                  {m.disposal_instruction}
                </p>
                <span className="text-[10px] text-[#60766C] block mt-1">
                  Updated: {new Date(m.last_updated).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {editingMaterialId === m.id ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="1"
                      value={editPriceInput}
                      onChange={(e) => setEditPriceInput(e.target.value)}
                      className="w-20 px-2.5 py-1.5 rounded-xl bg-[#FFFFFF] border border-[#16A765] text-[#12352A] text-xs font-bold focus:outline-none"
                    />
                    <button
                      onClick={() => handleSaveMaterialPrice(m.id)}
                      disabled={actionLoading === m.id}
                      type="button"
                      className="p-1.5 rounded-xl bg-[#16A765] text-[#FFFFFF] hover:bg-[#087A4B] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">check</span>
                    </button>
                    <button
                      onClick={() => setEditingMaterialId(null)}
                      type="button"
                      className="p-1.5 rounded-xl bg-[#F3FBF6] text-[#60766C] hover:text-[#12352A] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span className="text-base font-extrabold text-[#16A765]">
                        ₹{m.current_price_per_kg}
                      </span>
                      <span className="text-xs text-[#60766C] ml-0.5">/kg</span>
                    </div>
                    <button
                      onClick={() => {
                        setEditingMaterialId(m.id);
                        setEditPriceInput(m.current_price_per_kg.toString());
                      }}
                      type="button"
                      className="p-2 rounded-xl bg-[#F3FBF6] hover:bg-[#E8F8EE] text-[#60766C] hover:text-[#12352A] transition-colors border border-[#D8EADF]"
                      title="Edit price"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 7. Tab: Users Management */}
      {activeTab === 'users' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#12352A] uppercase tracking-wider">
              System Registered Users ({users.length})
            </h3>
          </div>

          {users.map((u) => (
            <div
              key={u.id}
              className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex items-center justify-between shadow-sm hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-[#12352A]">{u.name}</h4>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase ${
                      u.role === 'admin'
                        ? 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5]'
                        : u.role === 'collector'
                        ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]'
                        : 'bg-[#E8F8EE] text-[#16A765] border border-[#D8EADF]'
                    }`}
                  >
                    {u.role || 'user'}
                  </span>
                </div>
                <p className="text-xs text-[#60766C] mt-1">{u.email}</p>
                <p className="text-xs text-[#60766C] mt-0.5">{u.address || 'Hyderabad'}</p>
              </div>

              <div className="text-right">
                <span className="text-sm font-bold text-[#16A765] block">
                  {u.eco_credits || 0} Credits
                </span>
                <span className="text-xs text-[#60766C] font-medium mt-0.5 block">
                  {u.total_waste_recycled || 0} kg recycled
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 8. Tab: Audit Log */}
      {activeTab === 'audit' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#12352A] uppercase tracking-wider">
              Pickup Requests & Transactions Audit
            </h3>
            <span className="text-xs text-[#60766C] font-mono">Immutable Log</span>
          </div>

          {uniquePickups.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex flex-col gap-2 text-xs font-mono shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between text-[#16A765]">
                <span className="font-bold">ID: {p.id}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#E8F8EE] text-[#16A765] text-[10px] font-semibold border border-[#D8EADF]">
                  STATUS: {p.status}
                </span>
              </div>
              <div className="text-[#12352A] font-sans font-medium">
                Customer: {p.user_name} • Category: {p.waste_category}
              </div>
              <div className="text-[#60766C] text-xs">
                Weight: {p.actual_weight || p.estimated_weight} kg • Final: ₹
                {p.final_value || p.estimated_value}
              </div>
              <div className="text-[11px] text-[#60766C]">
                Created: {new Date(p.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 9. Tab: Partners Data Grid */}
      {activeTab === 'partners' && (
        <div className="flex flex-col gap-4">
          {/* Partners Header & Sub-navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs font-bold text-[#12352A] uppercase tracking-wider">
              Partner Management & Eco Rewards
            </h3>
            <div className="bg-[#F3FBF6] p-1 rounded-xl border border-[#D8EADF] flex items-center gap-1 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setPartnerSubTab('pipeline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  partnerSubTab === 'pipeline'
                    ? 'bg-[#16A765] text-[#FFFFFF] shadow-sm'
                    : 'text-[#60766C] hover:text-[#12352A]'
                }`}
              >
                Partners ({partners.length})
              </button>
              <button
                type="button"
                onClick={() => setPartnerSubTab('rewards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  partnerSubTab === 'rewards'
                    ? 'bg-[#16A765] text-[#FFFFFF] shadow-sm'
                    : 'text-[#60766C] hover:text-[#12352A]'
                }`}
              >
                Rewards ({rewards.length})
              </button>
              <button
                type="button"
                onClick={() => setPartnerSubTab('redemptions')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  partnerSubTab === 'redemptions'
                    ? 'bg-[#16A765] text-[#FFFFFF] shadow-sm'
                    : 'text-[#60766C] hover:text-[#12352A]'
                }`}
              >
                Redemptions ({redemptions.length})
              </button>
            </div>
          </div>

          {/* Subtab 1: Pipeline / Partners List */}
          {partnerSubTab === 'pipeline' && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddPartner(!showAddPartner)}
                  className="px-4 py-2 rounded-xl bg-[#16A765] text-[#FFFFFF] text-xs font-bold hover:bg-[#087A4B] flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Add Reward Partner
                </button>
              </div>

              {/* Add Partner Form Modal */}
              {showAddPartner && (
                <form
                  onSubmit={handleAddPartnerSubmit}
                  className="p-5 rounded-2xl bg-[#F3FBF6] border border-[#D8EADF] flex flex-col gap-3.5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#12352A]">Register Eco Reward Partner</span>
                    <button
                      type="button"
                      onClick={() => setShowAddPartner(false)}
                      className="text-xs text-[#60766C] hover:text-[#12352A] p-1"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-[#60766C] block mb-1 font-semibold">Partner Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Organic India Store"
                        value={newPartnerName}
                        onChange={(e) => setNewPartnerName(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#D8EADF] text-[#12352A] text-xs font-medium focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765] focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#60766C] block mb-1 font-semibold">Category</label>
                      <select
                        value={newPartnerCategory}
                        onChange={(e) => setNewPartnerCategory(e.target.value as PartnerCategory)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#D8EADF] text-[#12352A] text-xs font-medium focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765] focus:outline-none transition-all"
                      >
                        <option value="Food & Dining">Food & Dining</option>
                        <option value="Grocery & Organic">Grocery & Organic</option>
                        <option value="Fashion & Apparel">Fashion & Apparel</option>
                        <option value="Mobility & Transport">Mobility & Transport</option>
                        <option value="Home & Living">Home & Living</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-[#60766C] block mb-1 font-semibold">City Scope</label>
                      <select
                        value={newPartnerScope}
                        onChange={(e) => setNewPartnerScope(e.target.value as ServiceAreaScope)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#D8EADF] text-[#12352A] text-xs font-medium focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765] focus:outline-none transition-all"
                      >
                        <option value="Hyderabad">Hyderabad</option>
                        <option value="Bengaluru">Bengaluru</option>
                        <option value="Pan-India">Pan-India</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-[#60766C] block mb-1 font-semibold">Discount Offer Highlight</label>
                      <input
                        type="text"
                        placeholder="e.g. 20% OFF"
                        value={newPartnerDiscount}
                        onChange={(e) => setNewPartnerDiscount(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#D8EADF] text-[#12352A] text-xs font-medium focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765] focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-[#60766C] block mb-1 font-semibold">Contact Email</label>
                    <input
                      type="email"
                      placeholder="partner@example.com"
                      value={newPartnerContact}
                      onChange={(e) => setNewPartnerContact(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#D8EADF] text-[#12352A] text-xs font-medium focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765] focus:outline-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="py-2.5 rounded-xl bg-[#16A765] text-[#FFFFFF] text-xs font-bold hover:bg-[#087A4B] shadow-sm transition-all"
                  >
                    Save Partner Profile
                  </button>
                </form>
              )}

              {/* Partners Data Grid */}
              {partners.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex flex-col items-center justify-center text-center gap-2 shadow-sm">
                  <span className="material-symbols-outlined text-[36px] text-[#16A765]">handshake</span>
                  <p className="text-xs text-[#60766C]">No eco reward partners registered yet.</p>
                </div>
              ) : (
                partners.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex flex-col gap-3 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-[#12352A]">{p.name}</h4>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              p.partnership_status === 'Active'
                                ? 'bg-[#E8F8EE] text-[#16A765] border border-[#D8EADF]'
                                : p.partnership_status === 'Prospect'
                                ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]'
                                : 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5]'
                            }`}
                          >
                            {p.partnership_status}
                          </span>
                        </div>
                        <p className="text-xs text-[#60766C] mt-1">{p.category} • {p.city_scope}</p>
                        {p.discount_highlight && (
                          <span className="inline-block mt-1 text-[11px] font-bold text-[#16A765]">
                            Offer: {p.discount_highlight}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {p.partnership_status !== 'Active' && (
                          <button
                            type="button"
                            onClick={() => handlePartnerStatusChange(p.id, 'Active', true)}
                            disabled={actionLoading === p.id}
                            className="px-3.5 py-1.5 rounded-xl bg-[#16A765] text-[#FFFFFF] text-xs font-bold hover:bg-[#087A4B] shadow-sm transition-all"
                          >
                            Activate
                          </button>
                        )}
                        {p.partnership_status === 'Active' && (
                          <button
                            type="button"
                            onClick={() => handlePartnerStatusChange(p.id, 'Paused', false)}
                            disabled={actionLoading === p.id}
                            className="px-3.5 py-1.5 rounded-xl bg-[#FFFFFF] text-[#DC2626] border border-[#D8EADF] hover:bg-[#FEE2E2] text-xs font-semibold transition-all"
                          >
                            Pause
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Subtab 2: Rewards List */}
          {partnerSubTab === 'rewards' && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddReward(!showAddReward)}
                  className="px-4 py-2 rounded-xl bg-[#16A765] text-[#FFFFFF] text-xs font-bold hover:bg-[#087A4B] flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Create Reward Coupon
                </button>
              </div>

              {/* Add Reward Form Modal */}
              {showAddReward && (
                <form
                  onSubmit={handleAddRewardSubmit}
                  className="p-5 rounded-2xl bg-[#F3FBF6] border border-[#D8EADF] flex flex-col gap-3.5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#12352A]">Create New Reward Coupon</span>
                    <button
                      type="button"
                      onClick={() => setShowAddReward(false)}
                      className="text-xs text-[#60766C] hover:text-[#12352A] p-1"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-[#60766C] block mb-1 font-semibold">Reward Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ₹100 Off Organic Groceries"
                        value={newRewardTitle}
                        onChange={(e) => setNewRewardTitle(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#D8EADF] text-[#12352A] text-xs font-medium focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765] focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#60766C] block mb-1 font-semibold">Credits Required</label>
                      <input
                        type="number"
                        required
                        value={newRewardCredits}
                        onChange={(e) => setNewRewardCredits(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#D8EADF] text-[#12352A] text-xs font-medium focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765] focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-[#60766C] block mb-1 font-semibold">Discount Value Display</label>
                      <input
                        type="text"
                        placeholder="₹100 OFF"
                        value={newRewardDiscount}
                        onChange={(e) => setNewRewardDiscount(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#D8EADF] text-[#12352A] text-xs font-medium focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765] focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#60766C] block mb-1 font-semibold">Partner</label>
                      <select
                        value={newRewardPartnerId}
                        onChange={(e) => setNewRewardPartnerId(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#D8EADF] text-[#12352A] text-xs font-medium focus:border-[#16A765] focus:ring-1 focus:ring-[#16A765] focus:outline-none transition-all"
                      >
                        <option value="">Select Partner</option>
                        {partners.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="py-2.5 rounded-xl bg-[#16A765] text-[#FFFFFF] text-xs font-bold hover:bg-[#087A4B] shadow-sm transition-all"
                  >
                    Publish Reward Coupon
                  </button>
                </form>
              )}

              {/* Rewards List */}
              {rewards.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex flex-col items-center justify-center text-center gap-2 shadow-sm">
                  <span className="material-symbols-outlined text-[36px] text-[#16A765]">confirmation_number</span>
                  <p className="text-xs text-[#60766C]">No reward coupons active.</p>
                </div>
              ) : (
                rewards.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex items-center justify-between shadow-sm hover:shadow-md transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-[#12352A]">{r.reward_title}</h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#E8F8EE] text-[#16A765] border border-[#D8EADF]">
                          {r.discount_value}
                        </span>
                      </div>
                      <p className="text-xs text-[#60766C] mt-1">Partner: {r.partner_name} • Category: {r.reward_category}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-[#16A765] block">
                        {r.credits_required} Credits
                      </span>
                      <span className="text-[10px] text-[#60766C] font-medium block mt-0.5">
                        Stock: {r.stock_remaining} left
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Subtab 3: Redemptions */}
          {partnerSubTab === 'redemptions' && (
            <div className="flex flex-col gap-4">
              {redemptions.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex flex-col items-center justify-center text-center gap-2 shadow-sm">
                  <span className="material-symbols-outlined text-[36px] text-[#16A765]">receipt_long</span>
                  <p className="text-xs text-[#60766C]">No reward redemptions recorded yet.</p>
                </div>
              ) : (
                redemptions.map((red) => (
                  <div
                    key={red.id}
                    className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#D8EADF] flex items-center justify-between shadow-sm hover:shadow-md transition-all"
                  >
                    <div>
                      <span className="text-xs font-bold text-[#12352A]">{red.user_name || red.user_id}</span>
                      <p className="text-xs text-[#60766C] mt-0.5">{red.reward_title}</p>
                      <span className="text-[10px] text-[#60766C] block mt-0.5">
                        {new Date(red.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#E8F8EE] text-[#16A765] border border-[#D8EADF]">
                        {red.status}
                      </span>
                      <span className="text-xs text-[#60766C] block mt-1 font-medium">
                        -{red.credits_spent} Credits
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
