export type ScreenType = 'dashboard' | 'facilities' | 'scan' | 'rewards' | 'guide';

export type UserRole = 'user' | 'collector' | 'admin';

export type Language = 'EN' | 'HI' | 'TE';

export type AuthScreenMode = 'welcome' | 'login' | 'register';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role?: UserRole;
  address?: string;
  profile_image?: string;
  eco_credits?: number;
  total_waste_recycled?: number;
  total_earnings?: number;
  createdAt?: string;
}

export interface ScrapRate {
  id: string;
  name: string;
  rate: number;
  unit: string;
  trend: 'up' | 'flat' | 'down';
  category: 'paper' | 'plastic' | 'metal' | 'ewaste';
}

export interface UserEcoProfile {
  id?: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  role?: UserRole;
  address?: string;
  status: string;
  level: number;
  levelTitle: string;
  points: number;
  maxPoints: number;
  nextLevelPoints: number;
  nextLevelTitle: string;
  ecoScore: number;
  maxScore: number;
  tier: string;
  weeklyGrowth: string;
  scoreDescription: string;
  scoreRegion: string;
  recommendations: string[];
}

export interface ImpactMetrics {
  totalScans: number;
  dryDivertedKg: number;
  co2OffsetKg: number;
  pickupsDone: number;
  lastUpdated: string;
}

export interface SegregationBreakdown {
  dryRecyclable: number;
  organicWet: number;
  eWaste: number;
  hazardous: number;
}

export interface DailyQuest {
  id: string;
  title: string;
  category: string;
  expiresIn: string;
  completedCount: number;
  totalRequired: number;
  pointsReward: number;
  isClaimed: boolean;
}

export interface CommunityMission {
  id: string;
  tag: string;
  title: string;
  location: string;
  rewardPoints: number;
  verifiedStatus?: string;
  image: string;
}

export interface Facility {
  id: string;
  name: string;
  rating: number;
  reviewsCount: number;
  isOpen: boolean;
  statusText: string;
  address: string;
  distance: string;
  verified: boolean;
  verifiedBadgeText?: string;
  accepts: string[];
  phone: string;
  image: string;
  category: 'kabadiwala' | 'ewaste' | 'bbmp_dwcc';
}

export interface ScheduledPickup {
  id: string;
  status: 'confirmed' | 'pending' | 'completed';
  statusText: string;
  dateTimeSlot: string;
  partnerName: string;
  partnerVehicle?: string;
  partnerRating?: string;
  partnerImage?: string;
  collectorImage?: string;
  pickupsCount?: string;
  phone?: string;
  otp: string;
  itemsSummary: string;
  weightEst: string;
  payoutEst: string;
  isFixedPrice?: boolean;
  collectorStatus?: PickupStatus;
}

export interface SegregationGuideItem {
  id: string;
  name: string;
  bin: string;
  type: 'dry' | 'wet' | 'hazard' | 'ewaste';
  tip: string;
  icon: string;
  color: string;
}

export interface RewardVoucher {
  id: string;
  brand: 'Zepto' | 'Swiggy' | 'Google Play' | 'Zomato' | 'Daily Dump' | 'Phool';
  brandColor: string;
  brandBg: string;
  iconName: string;
  title: string;
  description: string;
  valueText: string;
  pointsCost: number;
  code: string;
  category: 'groceries' | 'food' | 'playstore' | 'eco';
  expiryDays: number;
  terms: string;
  howToRedeem: string;
}

export interface ClaimedVoucher {
  id: string;
  voucherId: string;
  brand: string;
  title: string;
  valueText: string;
  code: string;
  claimedAt: string;
  expiresAt: string;
  howToRedeem: string;
}

// Database-backed real entity interfaces
export interface DbWasteMaterialItem {
  id: string;
  material_name: string;
  category: 'Plastic' | 'Paper' | 'Cardboard' | 'Metal' | 'Glass' | 'E-waste' | 'Organic' | 'Textile' | 'Other';
  current_price_per_kg: number;
  unit: string;
  recyclable: boolean;
  disposal_instruction: string;
  last_updated: string;
}

export interface DbCollectorItem {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  service_area: string;
  latitude: number;
  longitude: number;
  available: boolean;
  rating: number;
  total_pickups: number;
  total_earnings: number;
  profile_image?: string;
  avatar_url?: string;
  vehicle_info?: string;
  badge_title?: string;
}

export type PickupStatus =
  | 'REQUESTED'
  | 'ASSIGNING'
  | 'ACCEPTED'
  | 'ON_THE_WAY'
  | 'ARRIVED'
  | 'OTP_VERIFICATION'
  | 'OTP_VERIFIED'
  | 'COLLECTING'
  | 'WEIGHT_VERIFIED'
  | 'AMOUNT_CONFIRMED'
  | 'PAYMENT_PENDING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'FAILED'
  | 'NO_SHOW';

export interface DbPickupStatusLog {
  id?: string;
  pickup_id?: string;
  old_status?: PickupStatus;
  new_status?: PickupStatus;
  status: PickupStatus;
  title: string;
  changed_by?: string;
  changed_by_role?: 'user' | 'collector' | 'admin' | 'system';
  timestamp: string;
  note?: string;
}

export interface DbPickupItem {
  id: string;
  user_id: string;
  user_name?: string;
  user_phone?: string;
  collector_id?: string;
  collector_name?: string;
  collector_rating?: number;
  collector_phone?: string;
  collector_vehicle?: string;
  waste_category: string;
  items_summary?: string;
  estimated_weight: number;
  estimated_value: number;
  actual_weight?: number;
  rate_per_kg?: number;
  final_value?: number;
  pickup_address: string;
  special_instructions?: string;
  latitude: number;
  longitude: number;
  preferred_date: string;
  preferred_time: string;
  status: PickupStatus;
  status_history?: DbPickupStatusLog[];
  otp: string;
  otp_attempts?: number;
  otp_verified_at?: string;
  cancelled_by?: string;
  cancelled_reason?: string;
  cancelled_at?: string;
  rating?: number;
  review?: string;
  rating_created_at?: string;
  assigned_at?: string;
  accepted_at?: string;
  updated_at?: string;
  created_at: string;
  completed_at?: string;
}

export interface DbPickupRating {
  id: string;
  pickup_id: string;
  user_id: string;
  collector_id: string;
  rating: number;
  review?: string;
  created_at: string;
}

export type ActivityType =
  | 'WASTE_SCANNED'
  | 'PICKUP_REQUESTED'
  | 'PICKUP_ACCEPTED'
  | 'COLLECTOR_ON_THE_WAY'
  | 'WASTE_COLLECTED'
  | 'WEIGHT_VERIFIED'
  | 'FINAL_AMOUNT_RECEIVED'
  | 'ECO_CREDITS_EARNED'
  | 'REWARD_REDEEMED'
  | 'CERTIFICATE_EARNED';

export interface DbUserActivity {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  title: string;
  description: string;
  pickup_id?: string;
  scan_id?: string;
  reward_id?: string;
  amount?: number;
  eco_credits?: number;
  waste_material?: string;
  weight?: number;
  timestamp: string;
  status?: string;
  metadata?: Record<string, any>;
}

export interface DbPaymentItem {
  id: string;
  pickup_id: string;
  user_id: string;
  collector_id: string;
  amount: number;
  payment_method: 'UPI' | 'CASH';
  payment_status: 'PAID' | 'PENDING';
  transaction_reference: string;
  created_at: string;
}

export type PartnerCategory =
  | 'food_restaurants'
  | 'shopping'
  | 'entertainment'
  | 'student_benefits'
  | 'travel_lifestyle'
  | 'eco_friendly'
  | 'local_partners';

export type PartnershipStatus =
  | 'Prospect'
  | 'Contacted'
  | 'Negotiating'
  | 'Active'
  | 'Paused'
  | 'Expired';

export type ServiceAreaScope = 'Hyderabad' | 'Telangana' | 'Pan-India' | 'Online-Only';

export type RewardCategory =
  | 'food'
  | 'shopping'
  | 'entertainment'
  | 'student'
  | 'travel'
  | 'eco'
  | 'local'
  | 'digital_vouchers'
  | 'sustainability_rewards';

export type VoucherType = 'digital_coupon' | 'discount' | 'voucher' | 'partner_offer' | 'local_reward';

export type SponsoredType = 'organic' | 'partner' | 'sponsored';

export type RedemptionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';

export interface DbPartner {
  id: string;
  partner_name: string;
  name?: string;
  logo?: string;
  logo_url?: string;
  website?: string;
  website_url?: string;
  category: PartnerCategory;
  description: string;
  location_area: string;
  contact_info: string;
  contact_email?: string;
  partnership_status: PartnershipStatus;
  verified_status: boolean;
  verified_badge?: boolean;
  reward_types: string[];
  reward_catalog?: string[];
  start_date: string;
  expiry_date: string;
  terms_and_conditions: string;
  active: boolean;
  city_availability: ServiceAreaScope;
  city_scope?: ServiceAreaScope;
  discount_highlight?: string;
  user_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface DbEcoTxItem {
  id: string;
  user_id: string;
  type: 'EARNED' | 'REDEEMED' | 'BONUS' | 'REVERSAL' | 'ADJUSTMENT';
  credits: number;
  amount?: number;
  source: string;
  reference_id: string;
  description?: string;
  created_at: string;
}

export interface DbRewardItem {
  id: string;
  partner_id: string;
  partner_name: string;
  partner_logo?: string;
  title: string;
  reward_title?: string;
  description: string;
  reward_description?: string;
  reward_category: RewardCategory | string;
  category?: string;
  credits_required: number;
  discount_value: string;
  reward_value?: string;
  reward_type?: VoucherType | string;
  voucher_type?: VoucherType;
  terms: string;
  expiry_date: string;
  redemption_method?: 'PROVIDER_API' | 'PARTNER_CODE' | 'DIRECT_VOUCHER';
  provider?: string;
  provider_reward_id?: string;
  redemption_limit: number;
  stock: number;
  stock_remaining?: number;
  active: boolean;
  is_active?: boolean;
  is_verified?: boolean;
  sponsored_type: SponsoredType | string;
  city_scope?: ServiceAreaScope;
  code_template?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbRewardRedemption {
  id: string;
  user_id: string;
  reward_id: string;
  partner_id: string;
  partner_name?: string;
  reward_title?: string;
  discount_value?: string;
  credits_spent: number;
  credits_used?: number;
  provider?: string;
  provider_transaction_id?: string;
  voucher_id?: string;
  voucher_code: string;
  voucher_pin?: string;
  redemption_code?: string;
  redemption_date?: string;
  redeemed_at?: string;
  expiry_date?: string;
  expires_at?: string;
  status?: RedemptionStatus;
  redemption_status?: RedemptionStatus;
  used_at?: string;
  how_to_redeem?: string;
  redemption_instructions?: string;
}

export type RecipientRole = 'user' | 'collector' | 'admin';

export interface DbNotification {
  id: string;
  user_id: string;
  recipient_id?: string;
  recipient_role?: RecipientRole;
  title: string;
  message: string;
  type: string;
  notification_type?: string;
  is_read?: boolean;
  read?: boolean;
  pickup_id?: string;
  reward_id?: string;
  created_at: string;
  read_at?: string;
  metadata?: Record<string, any>;
}

export interface AdminStatsData {
  totalUsers: number;
  totalCollectors: number;
  verifiedCollectors: number;
  totalPickups: number;
  completedPickups: number;
  totalWasteRecycled: number;
  totalTransactionValue: number;
  ecoCreditsIssued: number;
  activeRewards: number;
  totalPartners?: number;
  activePartners?: number;
  prospectPartners?: number;
  totalRedemptions?: number;
  creditsRedeemed?: number;
  wasteByCategory: Record<string, number>;
  recentPickups: DbPickupItem[];
  recentPayments: DbPaymentItem[];
  recentRedemptions?: DbRewardRedemption[];
}

export interface PartnerDashboardData {
  partner: DbPartner;
  rewards: DbRewardItem[];
  redemptions: DbRewardRedemption[];
  totalViews: number;
  totalRedemptions: number;
  activeVouchers: number;
  usedVouchers: number;
  creditsRedeemed: number;
  conversionRatePct: number;
}

export interface LiveCollectorLocation {
  available: boolean;
  message?: string;
  location?: {
    pickup_id: string;
    collector_id: string;
    latitude: number;
    longitude: number;
    updated_at: string;
    tracking_active: boolean;
  };
  pickup_location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  distance_km?: number;
  distance_formatted?: string;
  approx_eta_mins?: number;
  approx_eta_formatted?: string;
  status?: string;
  status_text?: string;
  maps_api_configured?: boolean;
}

