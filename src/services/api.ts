import {
  AuthUser,
  DbWasteMaterialItem,
  DbCollectorItem,
  DbPickupItem,
  DbPaymentItem,
  DbEcoTxItem,
  DbRewardItem,
  DbPartner,
  PartnershipStatus,
  DbRewardRedemption,
  PartnerDashboardData,
  DbUserActivity,
  DbNotification,
  AdminStatsData,
  LiveCollectorLocation,
} from '../types';

export interface WasteScanResponse {
  scan: {
    id: string;
    user_id: string;
    detected_material: string;
    waste_category: string;
    confidence: number;
    estimated_weight: number | null;
    estimated_value: number | null;
    disposal_instruction: string;
    created_at: string;
  };
  analysis: {
    material: string;
    category: string;
    material_type?: string;
    confidence: number;
    estimated_weight: number | null;
    weight_range_kg?: string | null;
    recyclable: boolean;
    recyclability_status?:
      | 'Highly Recyclable'
      | 'Recyclable'
      | 'Conditionally Recyclable'
      | 'Special Disposal Required'
      | 'Not Recyclable'
      | 'Requires Separation';
    best_for?: string;
    estimated_value: number | null;
    value_text?: string;
    disposal_instruction: string;
    current_rate_per_kg: number | null;
    detected_items?: string[];
    requires_verification?: boolean;
    reason?: string;
    is_unidentifiable?: boolean;
  };
}

export const api = {
  // Users & Auth
  async getUsers(): Promise<AuthUser[]> {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async login(email?: string, phone?: string, password?: string): Promise<AuthUser> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, phone, password }),
    });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('ecoscan_jwt_token', data.token);
    }
    return data.user || data;
  },

  async register(data: {
    name: string;
    email: string;
    phone?: string;
    password?: string;
    role?: 'user' | 'collector' | 'admin';
    address?: string;
  }): Promise<AuthUser> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Registration failed');
    const resData = await res.json();
    if (resData.token) {
      localStorage.setItem('ecoscan_jwt_token', resData.token);
    }
    return resData.user || resData;
  },

  async getUserAddresses(userId: string): Promise<Array<{
    id: string;
    userId: string;
    label: string;
    fullAddress: string;
    pincode: string;
    city: string;
    isDefault: boolean;
  }>> {
    const res = await fetch(`/api/users/${userId}/addresses`);
    if (!res.ok) throw new Error('Failed to fetch user addresses');
    return res.json();
  },

  async addUserAddress(userId: string, data: {
    label?: string;
    fullAddress: string;
    pincode?: string;
    city?: string;
    landmark?: string;
  }) {
    const res = await fetch(`/api/users/${userId}/addresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add new address');
    return res.json();
  },

  async updateUser(id: string, updates: Partial<AuthUser>): Promise<AuthUser> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update user');
    return res.json();
  },

  // Waste Materials & Dynamic Prices
  async getMaterials(): Promise<DbWasteMaterialItem[]> {
    const res = await fetch('/api/materials');
    if (!res.ok) throw new Error('Failed to fetch materials');
    return res.json();
  },

  async updateMaterial(
    id: string,
    updates: Partial<DbWasteMaterialItem>
  ): Promise<DbWasteMaterialItem> {
    const res = await fetch(`/api/materials/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update material');
    return res.json();
  },

  async addMaterial(data: Partial<DbWasteMaterialItem>): Promise<DbWasteMaterialItem> {
    const res = await fetch('/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add material');
    return res.json();
  },

  // Real AI Waste Scanner (Gemini Vision)
  async scanWaste(
    imageBase64: string,
    mimeType: string = 'image/jpeg',
    userId?: string
  ): Promise<WasteScanResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    try {
      const res = await fetch('/api/waste/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64, mimeType, userId }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Analysis failed' }));
        throw new Error(err.error || 'Failed to analyze waste');
      }
      return res.json();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Waste analysis timed out. Using fast offline identification fallback.');
      }
      throw err;
    }
  },

  // Collectors
  async getCollectors(params?: {
    verified?: boolean;
    available?: boolean;
  }): Promise<DbCollectorItem[]> {
    const query = new URLSearchParams();
    if (params?.verified) query.set('verified', 'true');
    if (params?.available) query.set('available', 'true');
    const res = await fetch(`/api/collectors?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch collectors');
    return res.json();
  },

  async verifyCollector(
    id: string,
    status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED'
  ): Promise<DbCollectorItem> {
    const res = await fetch(`/api/collectors/${id}/verify`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update collector verification status');
    return res.json();
  },

  async toggleCollectorAvailability(id: string, available: boolean): Promise<DbCollectorItem> {
    const res = await fetch(`/api/collectors/${id}/availability`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available }),
    });
    if (!res.ok) throw new Error('Failed to toggle collector availability');
    return res.json();
  },

  // Pickups
  async getPickups(params?: {
    userId?: string;
    collectorId?: string;
    status?: string;
  }): Promise<DbPickupItem[]> {
    const query = new URLSearchParams();
    if (params?.userId) query.set('userId', params.userId);
    if (params?.collectorId) query.set('collectorId', params.collectorId);
    if (params?.status) query.set('status', params.status);
    const res = await fetch(`/api/pickups?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch pickups');
    return res.json();
  },

  async createPickup(data: {
    user_id: string;
    collector_id?: string;
    waste_category: string;
    items_summary?: string;
    estimated_weight: number;
    pickup_address: string;
    preferred_date: string;
    preferred_time: string;
  }): Promise<DbPickupItem> {
    const res = await fetch('/api/pickups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const resData = await res.json().catch(() => ({ error: 'Failed to create pickup request' }));
    if (!res.ok) throw new Error(resData.error || resData.message || 'Failed to create pickup request');
    return resData;
  },

  async updatePickupStatus(
    id: string,
    status: string,
    collectorId?: string
  ): Promise<DbPickupItem> {
    const res = await fetch(`/api/pickups/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, collector_id: collectorId }),
    });
    const resData = await res.json().catch(() => ({ error: 'Failed to update pickup status' }));
    if (!res.ok) throw new Error(resData.error || resData.message || 'Failed to update pickup status');
    return resData;
  },

  async verifyPickupOtp(
    id: string,
    otp: string,
    collectorId?: string
  ): Promise<{ message: string; pickup: DbPickupItem }> {
    const res = await fetch(`/api/pickups/${id}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp, collector_id: collectorId }),
    });
    const data = await res.json().catch(() => ({ error: 'Failed to verify OTP' }));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to verify OTP');
    }
    return data;
  },

  async regeneratePickupOtp(id: string, userId: string): Promise<{ success: boolean; message: string; otp?: string }> {
    const res = await fetch(`/api/pickups/${id}/regenerate-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    const data = await res.json().catch(() => ({ error: 'Failed to regenerate OTP' }));
    if (!res.ok) throw new Error(data.error || 'Failed to regenerate OTP');
    return data;
  },

  async cancelPickup(id: string, cancelledBy: string, role = 'user', reason?: string): Promise<DbPickupItem> {
    const res = await fetch(`/api/pickups/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancelled_by: cancelledBy, role, reason }),
    });
    const resData = await res.json().catch(() => ({ error: 'Failed to cancel pickup' }));
    if (!res.ok) throw new Error(resData.error || resData.message || 'Failed to cancel pickup');
    return resData;
  },

  async ratePickup(id: string, userId: string, rating: number, review?: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/pickups/${id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, rating, review }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to submit rating' }));
      throw new Error(err.error || 'Failed to submit rating');
    }
    return res.json();
  },

  async weighPickup(
    id: string,
    actualWeight: number,
    ratePerKg?: number
  ): Promise<DbPickupItem> {
    const res = await fetch(`/api/pickups/${id}/weigh`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actual_weight: actualWeight, rate_per_kg: ratePerKg }),
    });
    const resData = await res.json().catch(() => ({ error: 'Failed to update weight' }));
    if (!res.ok) throw new Error(resData.error || resData.message || 'Failed to update weight');
    return resData;
  },

  async completePickup(
    id: string,
    paymentMethod: 'UPI' | 'CASH' = 'UPI'
  ): Promise<{ pickup: DbPickupItem; payment: DbPaymentItem; ecoTransaction: DbEcoTxItem }> {
    const res = await fetch(`/api/pickups/${id}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_method: paymentMethod }),
    });
    const resData = await res.json().catch(() => ({ error: 'Failed to complete pickup' }));
    if (!res.ok) throw new Error(resData.error || resData.message || 'Failed to complete pickup');
    return resData;
  },

  // Live Location Tracking
  async updateCollectorLocation(
    pickupId: string,
    data: {
      collector_id: string;
      latitude: number;
      longitude: number;
      tracking_active?: boolean;
    }
  ): Promise<{ status: string; location: any }> {
    const res = await fetch(`/api/pickups/${pickupId}/location`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update location' }));
      throw new Error(err.error || 'Failed to update location');
    }
    return res.json();
  },

  async getCollectorLocation(
    pickupId: string,
    userId?: string
  ): Promise<LiveCollectorLocation> {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const res = await fetch(`/api/pickups/${pickupId}/location${query}`);
    if (!res.ok) throw new Error('Failed to fetch collector location');
    return res.json();
  },

  async stopCollectorLocation(pickupId: string): Promise<{ status: string; tracking_active: boolean }> {
    const res = await fetch(`/api/pickups/${pickupId}/location/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to stop location tracking');
    return res.json();
  },

  // Payments & Eco Transactions
  async getPayments(userId?: string): Promise<DbPaymentItem[]> {
    const res = await fetch(`/api/payments${userId ? `?userId=${userId}` : ''}`);
    if (!res.ok) throw new Error('Failed to fetch payments');
    return res.json();
  },

  async getEcoTransactions(userId?: string): Promise<DbEcoTxItem[]> {
    const res = await fetch(`/api/eco/transactions${userId ? `?userId=${userId}` : ''}`);
    if (!res.ok) throw new Error('Failed to fetch eco transactions');
    return res.json();
  },

  // Partners Ecosystem
  async getPartners(params?: { status?: string; verifiedOnly?: boolean }): Promise<DbPartner[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.verifiedOnly) query.set('verifiedOnly', 'true');
    const res = await fetch(`/api/partners?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch partners');
    return res.json();
  },

  async getPartnerById(id: string): Promise<DbPartner> {
    const res = await fetch(`/api/partners/${id}`);
    if (!res.ok) throw new Error('Failed to fetch partner details');
    return res.json();
  },

  async createPartner(data: Partial<DbPartner>): Promise<DbPartner> {
    const res = await fetch('/api/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create partner');
    return res.json();
  },

  async updatePartnerStatus(
    id: string,
    status: PartnershipStatus,
    verified?: boolean
  ): Promise<DbPartner> {
    const res = await fetch(`/api/partners/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, verified }),
    });
    if (!res.ok) throw new Error('Failed to update partner status');
    return res.json();
  },

  // Rewards & Redemptions
  async getRewards(category?: string, partnerId?: string): Promise<DbRewardItem[]> {
    const query = new URLSearchParams();
    if (category) query.set('category', category);
    if (partnerId) query.set('partnerId', partnerId);
    const res = await fetch(`/api/rewards?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch rewards');
    return res.json();
  },

  async addReward(data: Partial<DbRewardItem>): Promise<DbRewardItem> {
    const res = await fetch('/api/rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create reward');
    return res.json();
  },

  async updateReward(id: string, updates: Partial<DbRewardItem>): Promise<DbRewardItem> {
    const res = await fetch(`/api/rewards/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update reward');
    return res.json();
  },

  async redeemReward(
    userId: string,
    rewardId: string
  ): Promise<{ redemption: DbRewardRedemption; remaining_credits: number }> {
    const res = await fetch('/api/rewards/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, reward_id: rewardId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Redemption failed' }));
      throw new Error(err.error || 'Failed to redeem reward');
    }
    return res.json();
  },

  async getRedemptions(userId?: string): Promise<DbRewardRedemption[]> {
    const res = await fetch(`/api/rewards/redemptions${userId ? `?userId=${userId}` : ''}`);
    if (!res.ok) throw new Error('Failed to fetch redemptions');
    return res.json();
  },

  async getCreditLedger(userId: string): Promise<{ user_id: string; ledger_balance: number; transactions: DbEcoTxItem[] }> {
    const res = await fetch(`/api/user/credits/ledger?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error('Failed to fetch user credit ledger');
    return res.json();
  },

  async verifyRedemptionCode(
    code: string,
    partnerId?: string
  ): Promise<{ success: boolean; redemption?: DbRewardRedemption; message: string }> {
    const res = await fetch('/api/rewards/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, partner_id: partnerId }),
    });
    const data = await res.json().catch(() => ({ success: false, message: 'Verification failed' }));
    if (!res.ok) {
      throw new Error(data.message || 'Failed to verify code');
    }
    return data;
  },

  async getPartnerDashboard(partnerId: string): Promise<PartnerDashboardData> {
    const res = await fetch(`/api/partner/dashboard/${partnerId}`);
    if (!res.ok) throw new Error('Failed to fetch partner dashboard');
    return res.json();
  },

  async getNotifications(userId?: string, role?: string): Promise<DbNotification[]> {
    const query = new URLSearchParams();
    if (userId) query.set('userId', userId);
    if (role) query.set('role', role);
    const res = await fetch(`/api/notifications?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async markNotificationRead(notificationId: string): Promise<DbNotification> {
    const res = await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to mark notification as read');
    return res.json();
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
    const res = await fetch('/api/notifications/read-all', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error('Failed to mark all notifications as read');
  },

  async getUserActivities(userId: string, category?: string): Promise<DbUserActivity[]> {
    const query = new URLSearchParams({ userId });
    if (category) query.set('category', category);
    const res = await fetch(`/api/user/activities?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch user activities');
    return res.json();
  },

  // Admin Stats
  async getAdminStats(): Promise<AdminStatsData> {
    const res = await fetch('/api/admin/stats');
    if (!res.ok) throw new Error('Failed to fetch admin stats');
    return res.json();
  },

  // EcoAi Chatbot
  async askEcoAi(
    question: string,
    history?: { role: 'user' | 'model'; text: string }[]
  ): Promise<string> {
    const res = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, history }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to get answer from EcoAi' }));
      throw new Error(err.error || 'Failed to get answer from EcoAi');
    }
    const data = await res.json();
    return data.answer;
  },
};
