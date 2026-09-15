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

interface AdminDashboardProps {
  onRefresh?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onRefresh }) => {
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
    <div className="flex flex-col w-full max-w-lg mx-auto px-4 gap-4 pt-1 pb-24 text-[#172019]">
      {/* 1. Header Banner */}
      <div className="w-full rounded-2xl bg-[#FFFFFF] p-5 shadow-xs border border-[#DCE5DE] relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#E8F3EB] flex items-center justify-center text-[#3FA66B] border border-[#DCE5DE] shadow-xs">
              <span className="material-symbols-outlined text-[28px]">admin_panel_settings</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-[#172019] tracking-tight">EcoScan Admin Desk</h1>
              <p className="text-xs text-[#65736A]">Platform Verification, Prices & Operations</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E8F3EB] text-[#174D35] border border-[#DCE5DE]">
            System Online
          </span>
        </div>
      </div>

      {/* 2. Top Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] flex flex-col shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#65736A] tracking-wider">
            Total Recycled
          </span>
          <span className="text-lg font-bold text-[#172019] mt-1">
            {stats?.totalWasteRecycled || 0} <span className="text-xs text-[#3FA66B]">kg</span>
          </span>
          <span className="text-[10px] text-[#65736A] mt-0.5">Diverted from Landfill</span>
        </div>

        <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] flex flex-col shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#65736A] tracking-wider">
            Payout Settled
          </span>
          <span className="text-lg font-bold text-[#172019] mt-1">
            ₹{stats?.totalTransactionValue?.toLocaleString() || 0}
          </span>
          <span className="text-[10px] text-[#3FA66B] font-bold mt-0.5">To Citizens</span>
        </div>

        <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] flex flex-col shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#65736A] tracking-wider">
            Pickups Done
          </span>
          <span className="text-lg font-bold text-[#172019] mt-1">
            {stats?.completedPickups || 0} / {stats?.totalPickups || 0}
          </span>
          <span className="text-[10px] text-[#65736A] mt-0.5">Completed Rate</span>
        </div>

        <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] flex flex-col shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#65736A] tracking-wider">
            Collectors
          </span>
          <span className="text-lg font-bold text-[#172019] mt-1">
            {stats?.verifiedCollectors || 0} / {stats?.totalCollectors || 0}
          </span>
          <span className="text-[10px] text-[#3FA66B] font-bold mt-0.5">Verified</span>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="w-full bg-[#FFFFFF] p-1 rounded-xl shadow-xs flex items-center border border-[#DCE5DE] overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 min-w-[70px] py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
            activeTab === 'overview'
              ? 'bg-[#3FA66B] text-[#FFFFFF] shadow-xs'
              : 'text-[#65736A] hover:text-[#172019]'
          }`}
          type="button"
        >
          Overview
        </button>

        <button
          onClick={() => setActiveTab('collectors')}
          className={`flex-1 min-w-[70px] py-1.5 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1 ${
            activeTab === 'collectors'
              ? 'bg-[#3FA66B] text-[#FFFFFF] shadow-xs'
              : 'text-[#65736A] hover:text-[#172019]'
          }`}
          type="button"
        >
          <span>Collectors</span>
          {collectors.filter((c) => c.verification_status === 'PENDING').length > 0 && (
            <span className="w-2 h-2 rounded-full bg-[#D97706]"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('materials')}
          className={`flex-1 min-w-[70px] py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
            activeTab === 'materials'
              ? 'bg-[#3FA66B] text-[#FFFFFF] shadow-xs'
              : 'text-[#65736A] hover:text-[#172019]'
          }`}
          type="button"
        >
          Scrap Prices
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 min-w-[70px] py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
            activeTab === 'users'
              ? 'bg-[#3FA66B] text-[#FFFFFF] shadow-xs'
              : 'text-[#65736A] hover:text-[#172019]'
          }`}
          type="button"
        >
          Users
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 min-w-[70px] py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
            activeTab === 'audit'
              ? 'bg-[#3FA66B] text-[#FFFFFF] shadow-xs'
              : 'text-[#65736A] hover:text-[#172019]'
          }`}
          type="button"
        >
          Audit Log
        </button>

        <button
          onClick={() => setActiveTab('partners')}
          className={`flex-1 min-w-[70px] py-1.5 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1 ${
            activeTab === 'partners'
              ? 'bg-[#3FA66B] text-[#FFFFFF] shadow-xs'
              : 'text-[#65736A] hover:text-[#172019]'
          }`}
          type="button"
        >
          <span>Partners</span>
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
            <div className="p-4 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] flex flex-col gap-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#D97706] text-[22px]">pending_actions</span>
                  <div>
                    <h3 className="text-xs font-bold text-[#172019] uppercase tracking-wider">
                      Pending Kabadiwala Approvals ({collectors.filter((c) => c.verification_status === 'PENDING').length + users.filter((u) => u.role === 'collector' && !collectors.some((c) => c.user_id === u.id)).length})
                    </h3>
                    <p className="text-[11px] text-[#65736A]">Approval required to allow accepting doorstep scrap pickups</p>
                  </div>
                </div>
                <button
                  onClick={handleApproveAllPendingCollectors}
                  disabled={actionLoading === 'approve_all'}
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-[#D97706] text-[#FFFFFF] font-bold text-xs hover:bg-[#B45309] shadow-xs"
                >
                  Approve All Pending
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {collectors.filter((c) => c.verification_status === 'PENDING').map((c) => (
                  <div key={c.id} className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#FDE68A] flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-[#172019]">{c.name}</span>
                      <span className="text-[11px] text-[#65736A] block">{c.phone} • {c.service_area}</span>
                    </div>
                    <button
                      onClick={() => handleVerifyCollector(c.id, 'VERIFIED')}
                      disabled={actionLoading === c.id}
                      type="button"
                      className="px-3 py-1 rounded bg-[#3FA66B] hover:bg-[#174D35] text-[#FFFFFF] text-[11px] font-bold shadow-xs"
                    >
                      Approve & Verify
                    </button>
                  </div>
                ))}

                {users.filter((u) => u.role === 'collector' && !collectors.some((c) => c.user_id === u.id)).map((u) => (
                  <div key={u.id} className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#FDE68A] flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-[#172019]">{u.name} ({u.email})</span>
                      <span className="text-[11px] text-[#65736A] block">Phone: {u.phone || 'N/A'}</span>
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
                      className="px-3 py-1 rounded bg-[#D97706] hover:bg-[#B45309] text-[#FFFFFF] text-[11px] font-bold shadow-xs"
                    >
                      Approve & Link Profile
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Waste By Category Card */}
          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] flex flex-col gap-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#172019] uppercase tracking-wider">
                Waste Diverted by Category (kg)
              </h3>
              <span className="text-[10px] text-[#3FA66B] font-bold">Live Telemetry</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {stats?.wasteByCategory && Object.keys(stats.wasteByCategory).length > 0 ? (
                Object.entries(stats.wasteByCategory).map(([cat, rawKg]) => {
                  const kg = Number(rawKg) || 0;
                  const numValues = Object.values(stats.wasteByCategory).map((v) => Number(v) || 0);
                  const maxKg = Math.max(...numValues, 10);
                  const percent = Math.min(100, Math.round((kg / maxKg) * 100));
                  return (
                    <div key={cat} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#65736A] font-medium">{cat}</span>
                        <span className="text-[#172019] font-bold">{kg.toFixed(1)} kg</span>
                      </div>
                      <div className="w-full bg-[#F5F8F4] h-2 rounded-full overflow-hidden border border-[#DCE5DE]">
                        <div
                          className="bg-[#3FA66B] h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-[#65736A]">No category breakdown recorded yet.</p>
              )}
            </div>
          </div>

          {/* Eco Credits Overview */}
          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#65736A] tracking-wider">
                Eco Credits Issued
              </span>
              <h3 className="text-lg font-bold text-[#3FA66B] mt-0.5">
                {stats?.ecoCreditsIssued || 0} Credits
              </h3>
              <p className="text-xs text-[#65736A]">Awarded strictly once per completed pickup</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#E8F3EB] border border-[#DCE5DE] flex items-center justify-center text-[#3FA66B]">
              <span className="material-symbols-outlined text-[22px]">workspace_premium</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab: Collectors Verification */}
      {activeTab === 'collectors' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-[#172019] uppercase tracking-wider">
                Registered Scrap Partners ({collectors.length})
              </h3>
              <span className="text-[11px] text-[#65736A]">
                {collectors.filter((c) => c.verification_status === 'VERIFIED').length} Verified
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {collectors.length === 0 && (
                <button
                  onClick={handleSeedDefaultCollectorsSubmit}
                  disabled={actionLoading === 'seed_collectors'}
                  type="button"
                  className="px-2.5 py-1.5 rounded-lg bg-[#E8F3EB] text-[#174D35] border border-[#DCE5DE] text-xs font-bold hover:bg-[#D7E8DC] transition-all shrink-0"
                >
                  Seed Hyderabad Hubs
                </button>
              )}
              <button
                onClick={() => setShowAddCollector(!showAddCollector)}
                type="button"
                className="px-3 py-1.5 rounded-lg bg-[#3FA66B] text-[#FFFFFF] text-xs font-bold hover:bg-[#174D35] flex items-center gap-1 shadow-xs shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Add Scrap Partner
              </button>
            </div>
          </div>

          {/* Add Collector Modal / Form */}
          {showAddCollector && (
            <form
              onSubmit={handleAddCollectorSubmit}
              className="p-4 rounded-xl bg-[#E8F3EB] border border-[#DCE5DE] flex flex-col gap-3 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#172019]">Register New Scrap Partner / Collector</span>
                <button
                  type="button"
                  onClick={() => setShowAddCollector(false)}
                  className="text-xs text-[#65736A] hover:text-[#172019]"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#65736A] block mb-0.5 font-semibold">Business Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Green Earth Kabadiwala Hub"
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-[#FFFFFF] border border-[#DCE5DE] text-[#172019] text-xs font-bold focus:border-[#3FA66B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#65736A] block mb-0.5 font-semibold">Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98765 43210"
                    value={newColPhone}
                    onChange={(e) => setNewColPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-[#FFFFFF] border border-[#DCE5DE] text-[#172019] text-xs font-bold focus:border-[#3FA66B] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#65736A] block mb-0.5 font-semibold">Service Area</label>
                  <input
                    type="text"
                    placeholder="Jubilee Hills, Banjara Hills, Hyderabad"
                    value={newColArea}
                    onChange={(e) => setNewColArea(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-[#FFFFFF] border border-[#DCE5DE] text-[#172019] text-xs font-bold focus:border-[#3FA66B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#65736A] block mb-0.5 font-semibold">Verification Status</label>
                  <select
                    value={newColStatus}
                    onChange={(e) => setNewColStatus(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded bg-[#FFFFFF] border border-[#DCE5DE] text-[#172019] text-xs font-bold focus:border-[#3FA66B] focus:outline-none"
                  >
                    <option value="VERIFIED">VERIFIED (Approved)</option>
                    <option value="PENDING">PENDING (Requires Review)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="py-2 rounded bg-[#3FA66B] text-[#FFFFFF] text-xs font-bold hover:bg-[#174D35] shadow-xs"
              >
                Save & Register Scrap Partner
              </button>
            </form>
          )}

          {/* Registered User Accounts with role === 'collector' awaiting collector profile linking */}
          {users.filter((u) => u.role === 'collector' && !collectors.some((c) => c.user_id === u.id)).map((unlinkedUser) => (
            <div key={unlinkedUser.id} className="p-3.5 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-between gap-2 shadow-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D97706] block">Registered Collector User Awaiting Approval</span>
                <h4 className="text-xs font-bold text-[#172019]">{unlinkedUser.name} ({unlinkedUser.email})</h4>
                <p className="text-[11px] text-[#65736A] mt-0.5">Phone: {unlinkedUser.phone || 'N/A'}</p>
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
                className="px-3 py-1.5 rounded-lg bg-[#D97706] text-[#FFFFFF] font-bold text-xs hover:bg-[#B45309] shadow-xs shrink-0"
                type="button"
              >
                Approve & Link Profile
              </button>
            </div>
          ))}

          {collectors.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#DCE5DE] flex flex-col items-center justify-center text-center gap-3 shadow-xs">
              <span className="material-symbols-outlined text-[36px] text-[#3FA66B]">local_shipping</span>
              <div>
                <h4 className="text-sm font-bold text-[#172019]">No Scrap Partners Found</h4>
                <p className="text-xs text-[#65736A] mt-0.5 max-w-sm mx-auto">
                  Click "Add Scrap Partner" above or click below to populate default Hyderabad recycling depots.
                </p>
              </div>
              <button
                onClick={handleSeedDefaultCollectorsSubmit}
                disabled={actionLoading === 'seed_collectors'}
                type="button"
                className="px-4 py-2 rounded-xl bg-[#3FA66B] text-[#FFFFFF] text-xs font-bold hover:bg-[#174D35] shadow-xs"
              >
                Seed Default Hyderabad Scrap Partners
              </button>
            </div>
          ) : (
            collectors.map((c) => (
            <div
              key={c.id}
              className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] flex flex-col gap-2.5 shadow-xs"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-[#172019]">{c.name}</h4>
                    {c.verification_status === 'VERIFIED' && (
                      <span className="material-symbols-outlined text-[14px] text-[#3FA66B]">
                        verified
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#65736A] flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-[12px]">call</span>
                    {c.phone}
                  </p>
                  <p className="text-[10px] text-[#65736A] mt-0.5">Area: {c.service_area}</p>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.verification_status === 'VERIFIED'
                        ? 'bg-[#E8F3EB] text-[#174D35] border border-[#DCE5DE]'
                        : c.verification_status === 'PENDING'
                        ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]'
                        : 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5]'
                    }`}
                  >
                    {c.verification_status}
                  </span>
                  <span className="block text-[10px] text-[#65736A] mt-1">
                    {c.total_pickups} pickups • {c.rating}★
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1 border-t border-[#DCE5DE]">
                {c.verification_status !== 'VERIFIED' && (
                  <button
                    onClick={() => handleVerifyCollector(c.id, 'VERIFIED')}
                    disabled={actionLoading === c.id}
                    type="button"
                    className="flex-1 py-1.5 rounded bg-[#3FA66B] hover:bg-[#174D35] text-[#FFFFFF] text-[11px] font-bold transition-all shadow-xs"
                  >
                    Approve & Verify
                  </button>
                )}

                {c.verification_status !== 'SUSPENDED' && (
                  <button
                    onClick={() => handleVerifyCollector(c.id, 'SUSPENDED')}
                    disabled={actionLoading === c.id}
                    type="button"
                    className="px-3 py-1.5 rounded bg-[#FFFFFF] hover:bg-[#FEE2E2] text-[#DC2626] border border-[#DCE5DE] text-[11px] font-semibold transition-all"
                  >
                    Suspend
                  </button>
                )}

                {c.verification_status !== 'REJECTED' && c.verification_status === 'PENDING' && (
                  <button
                    onClick={() => handleVerifyCollector(c.id, 'REJECTED')}
                    disabled={actionLoading === c.id}
                    type="button"
                    className="px-3 py-1.5 rounded bg-[#FFFFFF] hover:bg-[#FEE2E2] text-[#DC2626] border border-[#DCE5DE] text-[11px] font-semibold transition-all"
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          )))}
        </div>
      )}

      {/* 6. Tab: Scrap Material Dynamic Pricing */}
      {activeTab === 'materials' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#172019] uppercase tracking-wider">
              Dynamic Mandi Scrap Rates ({materials.length})
            </h3>
            <button
              onClick={() => setShowAddMaterial(true)}
              type="button"
              className="px-2.5 py-1 rounded bg-[#3FA66B] text-[#FFFFFF] text-xs font-bold hover:bg-[#174D35] flex items-center gap-1 shadow-xs"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              Add Material
            </button>
          </div>

          {/* Add Material Modal / Form */}
          {showAddMaterial && (
            <form
              onSubmit={handleAddMaterial}
              className="p-3.5 rounded-xl bg-[#E8F3EB] border border-[#DCE5DE] flex flex-col gap-2.5 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#172019]">Add New Scrap Material</span>
                <button
                  type="button"
                  onClick={() => setShowAddMaterial(false)}
                  className="text-xs text-[#65736A] hover:text-[#172019]"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#65736A] block mb-0.5 font-semibold">Material Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Copper Wire Grade 1"
                    value={newMatName}
                    onChange={(e) => setNewMatName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-[#FFFFFF] border border-[#DCE5DE] text-[#172019] text-xs font-bold focus:border-[#3FA66B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#65736A] block mb-0.5 font-semibold">Category</label>
                  <select
                    value={newMatCategory}
                    onChange={(e) => setNewMatCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-[#FFFFFF] border border-[#DCE5DE] text-[#172019] text-xs font-bold focus:border-[#3FA66B] focus:outline-none"
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
                <label className="text-[10px] text-[#65736A] block mb-0.5 font-semibold">Rate (₹/kg)</label>
                <input
                  type="number"
                  required
                  step="0.5"
                  value={newMatPrice}
                  onChange={(e) => setNewMatPrice(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-[#FFFFFF] border border-[#DCE5DE] text-[#172019] text-xs font-bold focus:border-[#3FA66B] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="py-1.5 rounded bg-[#3FA66B] text-[#FFFFFF] text-xs font-bold hover:bg-[#174D35] shadow-xs"
              >
                Save to Scrap Database
              </button>
            </form>
          )}

          {/* List of Materials with Inline Price Editing */}
          {materials.map((m) => (
            <div
              key={m.id}
              className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] flex items-center justify-between gap-2 shadow-xs"
            >
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-[#172019]">{m.material_name}</h4>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#E8F3EB] text-[#174D35] font-semibold border border-[#DCE5DE]">
                    {m.category}
                  </span>
                </div>
                <p className="text-[10px] text-[#65736A] mt-0.5 line-clamp-1">
                  {m.disposal_instruction}
                </p>
                <span className="text-[9px] text-[#65736A] block mt-0.5">
                  Updated: {new Date(m.last_updated).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {editingMaterialId === m.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="1"
                      value={editPriceInput}
                      onChange={(e) => setEditPriceInput(e.target.value)}
                      className="w-16 px-2 py-1 rounded bg-[#FFFFFF] border border-[#3FA66B] text-[#172019] text-xs font-bold focus:outline-none"
                    />
                    <button
                      onClick={() => handleSaveMaterialPrice(m.id)}
                      disabled={actionLoading === m.id}
                      type="button"
                      className="p-1 rounded bg-[#3FA66B] text-[#FFFFFF] hover:bg-[#174D35]"
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    </button>
                    <button
                      onClick={() => setEditingMaterialId(null)}
                      type="button"
                      className="p-1 rounded bg-[#F5F8F4] text-[#65736A] hover:text-[#172019]"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <span className="text-sm font-bold text-[#3FA66B]">
                        ₹{m.current_price_per_kg}
                      </span>
                      <span className="text-[10px] text-[#65736A]">/kg</span>
                    </div>
                    <button
                      onClick={() => {
                        setEditingMaterialId(m.id);
                        setEditPriceInput(m.current_price_per_kg.toString());
                      }}
                      type="button"
                      className="p-1.5 rounded-lg bg-[#F5F8F4] hover:bg-[#E8F3EB] text-[#65736A] hover:text-[#172019] transition-colors border border-[#DCE5DE]"
                      title="Edit price"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
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
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#172019] uppercase tracking-wider">
              System Registered Users ({users.length})
            </h3>
          </div>

          {users.map((u) => (
            <div
              key={u.id}
              className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] flex items-center justify-between shadow-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-[#172019]">{u.name}</h4>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                      u.role === 'admin'
                        ? 'bg-[#FEE2E2] text-[#DC2626]'
                        : u.role === 'collector'
                        ? 'bg-[#FEF3C7] text-[#D97706]'
                        : 'bg-[#E8F3EB] text-[#174D35]'
                    }`}
                  >
                    {u.role || 'user'}
                  </span>
                </div>
                <p className="text-[11px] text-[#65736A] mt-0.5">{u.email}</p>
                <p className="text-[10px] text-[#65736A] mt-0.5">{u.address || 'Hyderabad'}</p>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-[#3FA66B] block">
                  {u.eco_credits || 0} Credits
                </span>
                <span className="text-[10px] text-[#65736A]">
                  {u.total_waste_recycled || 0} kg recycled
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 8. Tab: Audit Log */}
      {activeTab === 'audit' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#172019] uppercase tracking-wider">
              Pickup Requests & Transactions Audit
            </h3>
            <span className="text-[10px] text-[#65736A] font-mono">Immutable Log</span>
          </div>

          {uniquePickups.map((p) => (
            <div
              key={p.id}
              className="p-3 rounded-xl bg-[#FFFFFF] border border-[#DCE5DE] flex flex-col gap-1.5 text-xs font-mono shadow-xs"
            >
              <div className="flex items-center justify-between text-[#3FA66B]">
                <span className="font-bold">ID: {p.id}</span>
                <span className="px-1.5 py-0.2 rounded bg-[#E8F3EB] text-[#174D35] text-[10px] font-bold">
                  STATUS: {p.status}
                </span>
              </div>
              <div className="text-[#172019]">
                Customer: {p.user_name} • Category: {p.waste_category}
              </div>
              <div className="text-[#65736A] text-[11px]">
                Weight: {p.actual_weight || p.estimated_weight} kg • Final: ₹
                {p.final_value || p.estimated_value}
              </div>
              <div className="text-[10px] text-[#65736A]">
                Created: {new Date(p.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

  );
};
