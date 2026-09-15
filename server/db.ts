import fs from 'fs';
import path from 'path';
import { rewardProvider } from './rewardProvider';

export interface DbUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  profile_image: string;
  role: 'user' | 'collector' | 'admin';
  address: string;
  latitude?: number;
  longitude?: number;
  eco_credits: number;
  total_waste_recycled: number;
  total_earnings: number;
  created_at: string;
  password_hash?: string;
}

export interface DbWasteScan {
  id: string;
  user_id: string;
  image?: string;
  detected_material: string;
  waste_category: string;
  confidence: number;
  estimated_weight: number;
  estimated_value: number;
  disposal_instruction: string;
  created_at: string;
}

export interface DbWasteMaterial {
  id: string;
  material_name: string;
  category: 'Plastic' | 'Paper' | 'Cardboard' | 'Metal' | 'Glass' | 'E-waste' | 'Organic' | 'Textile' | 'Other';
  current_price_per_kg: number;
  unit: string;
  recyclable: boolean;
  disposal_instruction: string;
  last_updated: string;
}

export interface DbCollector {
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
}

export type PickupStatus =
  | 'REQUESTED'
  | 'ASSIGNING'
  | 'ACCEPTED'
  | 'ON_THE_WAY'
  | 'COLLECTOR_ON_THE_WAY'
  | 'ARRIVED'
  | 'OTP_PENDING'
  | 'OTP_VERIFICATION'
  | 'OTP_VERIFIED'
  | 'COLLECTING'
  | 'WEIGHED'
  | 'WEIGHT_VERIFIED'
  | 'AMOUNT_CONFIRMED'
  | 'PAYMENT_PENDING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'FAILED'
  | 'NO_SHOW';

export type RecipientRole = 'user' | 'collector' | 'admin';

export interface DbPickupStatusLog {
  id?: string;
  pickup_id?: string;
  old_status?: PickupStatus;
  new_status?: PickupStatus;
  status: PickupStatus;
  title: string;
  changed_by?: string;
  changed_by_role?: RecipientRole | 'system';
  timestamp: string;
  note?: string;
}

export interface DbPickupRequest {
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

export interface DbPickupLocation {
  pickup_id: string;
  collector_id: string;
  latitude: number;
  longitude: number;
  updated_at: string;
  tracking_active: boolean;
}

export interface DbPayment {
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

export interface DbEcoTransaction {
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

export interface DbRewardItem {
  id: string;
  partner_id: string;
  partner_name: string;
  partner_logo?: string;
  title: string;
  reward_title?: string;
  description: string;
  reward_description?: string;
  reward_category: string;
  category?: string;
  credits_required: number;
  discount_value: string;
  reward_value?: string;
  reward_type?: string;
  voucher_type?: string;
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
  sponsored_type: string;
  city_scope?: ServiceAreaScope;
  code_template?: string;
  created_at?: string;
  updated_at?: string;
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

export interface DbRewardRedemption {
  id: string;
  user_id: string;
  reward_id: string;
  partner_id?: string;
  partner_name?: string;
  reward_title?: string;
  discount_value?: string;
  credits_spent?: number;
  credits_used?: number;
  provider?: string;
  provider_transaction_id?: string;
  voucher_id?: string;
  voucher_code?: string;
  voucher_pin?: string;
  redemption_code: string;
  redemption_date?: string;
  redeemed_at?: string;
  expiry_date?: string;
  expires_at?: string;
  status?: string;
  redemption_status?: string;
  used_at?: string;
  how_to_redeem?: string;
  redemption_instructions?: string;
}

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
  wasteByCategory: Record<string, number>;
  recentPickups: DbPickupRequest[];
  recentPayments: DbPayment[];
}

export interface DatabaseSchema {
  users: DbUser[];
  waste_scans: DbWasteScan[];
  waste_materials: DbWasteMaterial[];
  collectors: DbCollector[];
  pickup_requests: DbPickupRequest[];
  pickup_locations?: DbPickupLocation[];
  payments: DbPayment[];
  eco_transactions: DbEcoTransaction[];
  rewards: DbRewardItem[];
  reward_redemptions: DbRewardRedemption[];
  partners?: DbPartner[];
  notifications?: DbNotification[];
  user_activities?: DbUserActivity[];
  pickup_ratings?: DbPickupRating[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'ecoscan_database.json');

const INITIAL_MATERIALS: DbWasteMaterial[] = [
  {
    id: 'mat-1',
    material_name: 'PET Plastic Bottles',
    category: 'Plastic',
    current_price_per_kg: 35,
    unit: '₹/kg',
    recyclable: true,
    disposal_instruction: 'Rinse with clean water, crush flat to reduce volume, place in blue dry bin.',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'mat-2',
    material_name: 'HDPE Plastic Containers',
    category: 'Plastic',
    current_price_per_kg: 28,
    unit: '₹/kg',
    recyclable: true,
    disposal_instruction: 'Clean milk jugs, detergent containers, rinse and dry before pickup.',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'mat-3',
    material_name: 'Corrugated Cardboard Boxes',
    category: 'Cardboard',
    current_price_per_kg: 14,
    unit: '₹/kg',
    recyclable: true,
    disposal_instruction: 'Flatten shipping boxes, protect strictly from moisture and oils.',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'mat-4',
    material_name: 'Newspaper & Mixed Paper',
    category: 'Paper',
    current_price_per_kg: 16,
    unit: '₹/kg',
    recyclable: true,
    disposal_instruction: 'Tie with jute string into bundles, keep dry for maximum payout.',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'mat-5',
    material_name: 'Iron & TMT Steel Rods',
    category: 'Metal',
    current_price_per_kg: 32,
    unit: '₹/kg',
    recyclable: true,
    disposal_instruction: 'Scrap construction steel and saria. Infinitely melted without quality loss.',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'mat-6',
    material_name: 'Aluminium Beverage Cans',
    category: 'Metal',
    current_price_per_kg: 145,
    unit: '₹/kg',
    recyclable: true,
    disposal_instruction: 'Crush flat. Energy saved during remelting is 95% compared to raw bauxite ore.',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'mat-7',
    material_name: 'Millberry Pure Copper Wire',
    category: 'Metal',
    current_price_per_kg: 510,
    unit: '₹/kg',
    recyclable: true,
    disposal_instruction: 'Stripped bright bare wire commands highest scrap premium in Indian mandis.',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'mat-8',
    material_name: 'Glass Bottles (Beer/Soda)',
    category: 'Glass',
    current_price_per_kg: 8,
    unit: '₹/kg',
    recyclable: true,
    disposal_instruction: 'Rinse bottles, ensure no breakage to ensure safe handling by collectors.',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'mat-9',
    material_name: 'E-Waste PCBs & Motherboards',
    category: 'E-waste',
    current_price_per_kg: 160,
    unit: '₹/kg',
    recyclable: true,
    disposal_instruction: 'Handle with care. CPCB authorized recyclers recover gold, silver, and palladium.',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'mat-10',
    material_name: 'Organic Kitchen & Food Waste',
    category: 'Organic',
    current_price_per_kg: 0,
    unit: '₹/kg',
    recyclable: false,
    disposal_instruction: 'Compost at home or hand to municipal green bins. No kabadiwala cash buyback.',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'mat-11',
    material_name: 'Cotton & Fabric Textile Scrap',
    category: 'Textile',
    current_price_per_kg: 18,
    unit: '₹/kg',
    recyclable: true,
    disposal_instruction: 'Shredded into industrial cleaning rags or re-spun into yarn.',
    last_updated: new Date().toISOString(),
  },
];

const INITIAL_USERS: DbUser[] = [
  {
    id: 'usr_aditi',
    name: 'Aditi Rao',
    email: 'aditi.rao@gmail.com',
    phone: '+91 98450 12345',
    profile_image: '',
    role: 'user',
    address: 'Plot 402, Road No 36, Jubilee Hills, Hyderabad, Telangana 500033',
    latitude: 17.4319,
    longitude: 78.4073,
    eco_credits: 750,
    total_waste_recycled: 18.4,
    total_earnings: 580,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'usr_collector_raju',
    name: 'Raju Kumar (Green Earth Hub)',
    email: 'raju.scrap@ecoscan.in',
    phone: '+91 98765 43210',
    profile_image: '',
    role: 'collector',
    address: 'Banjara Hills Road No 12, Hyderabad, Telangana 500034',
    latitude: 17.4156,
    longitude: 78.4347,
    eco_credits: 1400,
    total_waste_recycled: 412.0,
    total_earnings: 14250,
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: 'usr_collector_suresh',
    name: 'Suresh Gowda (Mandi Depot)',
    email: 'suresh.mandi@ecoscan.in',
    phone: '+91 98451 99887',
    profile_image: '',
    role: 'collector',
    address: 'Madhapur Scrap Yard, HITECH City, Hyderabad, Telangana 500081',
    latitude: 17.4486,
    longitude: 78.3908,
    eco_credits: 980,
    total_waste_recycled: 620.0,
    total_earnings: 21800,
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
  {
    id: 'usr_admin',
    name: 'EcoScan Admin Desk',
    email: 'admin@ecoscan.in',
    phone: '+91 40 4012 3456',
    profile_image: '',
    role: 'admin',
    address: 'EcoScan Tech Hub, Gachibowli, Hyderabad, Telangana 500032',
    latitude: 17.4401,
    longitude: 78.3489,
    eco_credits: 5000,
    total_waste_recycled: 1240.0,
    total_earnings: 0,
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
];

const INITIAL_COLLECTORS: DbCollector[] = [
  {
    id: 'col-1',
    user_id: 'usr_collector_raju',
    name: 'Raju Kumar (Green Earth Kabadiwala Hub)',
    phone: '+91 98765 43210',
    verification_status: 'VERIFIED',
    service_area: 'Jubilee Hills, Banjara Hills, Film Nagar, Madhapur',
    latitude: 17.4156,
    longitude: 78.4347,
    available: true,
    rating: 4.9,
    total_pickups: 142,
    total_earnings: 48950,
  },
  {
    id: 'col-2',
    user_id: 'usr_collector_suresh',
    name: 'Suresh Gowda (Hyderabad Metal & Paper Depot)',
    phone: '+91 98451 99887',
    verification_status: 'VERIFIED',
    service_area: 'HITECH City, Gachibowli, Kondapur, Madhapur',
    latitude: 17.4486,
    longitude: 78.3908,
    available: true,
    rating: 4.8,
    total_pickups: 89,
    total_earnings: 31200,
  },
  {
    id: 'col-3',
    user_id: 'usr_collector_pending',
    name: 'Ramesh Patel (Clean City Scrap)',
    phone: '+91 99002 33445',
    verification_status: 'PENDING',
    service_area: 'Kukatpally, Ameerpet, SR Nagar',
    latitude: 17.4849,
    longitude: 78.4138,
    available: false,
    rating: 4.5,
    total_pickups: 12,
    total_earnings: 3400,
  },
];

const INITIAL_PARTNERS: DbPartner[] = [
  {
    id: 'part-1',
    partner_name: 'Swachh Organic Cafe & Bakery',
    category: 'food_restaurants',
    description: 'Hyderabad zero-waste cafe serving organic farm-to-table meals in 100% compostable leafware.',
    location_area: 'Jubilee Hills & Gachibowli, Hyderabad',
    contact_info: 'partner@swachhcafe.in • +91 98490 11223',
    partnership_status: 'Active',
    verified_status: true,
    reward_types: ['Discount Coupon', 'Free Eco Drink'],
    start_date: '01/01/2026',
    expiry_date: '31/12/2026',
    terms_and_conditions: 'Valid on dine-in and takeaway. Minimum bill ₹299.',
    active: true,
    city_availability: 'Hyderabad',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: 'part-2',
    partner_name: 'Green Basket Organics',
    category: 'shopping',
    description: 'Certified organic grocery e-store delivering plastic-free produce across Telangana.',
    location_area: 'Telangana & Hyderabad Metro',
    contact_info: 'support@greenbasket.co.in • +91 40 2345 6789',
    partnership_status: 'Active',
    verified_status: true,
    reward_types: ['Shopping Voucher', 'Free Delivery'],
    start_date: '01/01/2026',
    expiry_date: '31/12/2026',
    terms_and_conditions: 'Applicable on organic vegetables, pulses, and cold-pressed oils.',
    active: true,
    city_availability: 'Telangana',
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
  {
    id: 'part-3',
    partner_name: 'Cinepolis Eco Cinema',
    category: 'entertainment',
    description: 'Premier cinema partner promoting carbon-neutral film screenings and popcorn eco-cups.',
    location_area: 'Pan-India Movie Multiplexes',
    contact_info: 'corporate@cinepolis.in',
    partnership_status: 'Active',
    verified_status: true,
    reward_types: ['Movie Ticket Offer', 'Combo Discount'],
    start_date: '01/01/2026',
    expiry_date: '31/12/2026',
    terms_and_conditions: 'Valid Monday through Thursday on all standard screen shows.',
    active: true,
    city_availability: 'Pan-India',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'part-4',
    partner_name: 'Campus Green Student Club',
    category: 'student_benefits',
    description: 'University green ambassador initiative rewarding students for campus segregation drives.',
    location_area: 'Colleges & Institutions across India',
    contact_info: 'students@campusgreen.edu.in',
    partnership_status: 'Active',
    verified_status: true,
    reward_types: ['Course Coupon', 'Student Discount'],
    start_date: '01/01/2026',
    expiry_date: '31/12/2026',
    terms_and_conditions: 'Requires valid college student ID card verification.',
    active: true,
    city_availability: 'Pan-India',
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: 'part-5',
    partner_name: 'Green Mobility EV Fleet',
    category: 'travel_lifestyle',
    description: 'Clean energy electric scooter & cab rentals for eco-friendly city commuting.',
    location_area: 'Hyderabad, Bengaluru, Chennai',
    contact_info: 'support@greenmobility.in',
    partnership_status: 'Active',
    verified_status: true,
    reward_types: ['Ride Cashback', 'Discount Code'],
    start_date: '01/01/2026',
    expiry_date: '31/12/2026',
    terms_and_conditions: 'Valid on first 5 electric scooter rentals per account.',
    active: true,
    city_availability: 'Hyderabad',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'part-6',
    partner_name: 'Phool Natural Upcycled Floral Products',
    category: 'eco_friendly',
    description: 'Charcoal-free incense and organic compost handcrafted from upcycled temple floral waste.',
    location_area: 'Online-Only Nationwide',
    contact_info: 'care@phool.co',
    partnership_status: 'Active',
    verified_status: true,
    reward_types: ['Eco Kit Voucher', 'Flat Discount'],
    start_date: '01/01/2026',
    expiry_date: '31/12/2026',
    terms_and_conditions: 'Valid on all handcrafted flower incense and Florafoam packaging products.',
    active: true,
    city_availability: 'Online-Only',
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
  {
    id: 'part-7',
    partner_name: 'Charminar Artisan Eco-Crafts',
    category: 'local_partners',
    description: 'Hyderabad local artisan guild producing handloom jute tote bags and recycled terracotta decor.',
    location_area: 'Old City & Shilparamam, Hyderabad',
    contact_info: 'artisans@hydecocrafts.org • +91 94401 88776',
    partnership_status: 'Active',
    verified_status: true,
    reward_types: ['Store Coupon', 'Handicraft Gift'],
    start_date: '01/01/2026',
    expiry_date: '31/12/2026',
    terms_and_conditions: 'Show EcoScan digital voucher code at artisan counter.',
    active: true,
    city_availability: 'Hyderabad',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'part-8',
    partner_name: 'Hyderabad Metro Food Hub',
    category: 'food_restaurants',
    description: 'Proposed local food court alliance for waste segregation incentives at metro stations.',
    location_area: 'Miyapur to LB Nagar Line, Hyderabad',
    contact_info: 'prospects@ecoscan.in',
    partnership_status: 'Prospect',
    verified_status: false,
    reward_types: ['Snack Coupon'],
    start_date: '01/03/2026',
    expiry_date: '31/12/2026',
    terms_and_conditions: 'Partnership under negotiation with municipal commercial desk.',
    active: false,
    city_availability: 'Hyderabad',
    created_at: new Date().toISOString(),
  },
];

const INITIAL_REWARDS: DbRewardItem[] = [
  {
    id: 'rew-1',
    partner_id: 'part-1',
    partner_name: 'Swachh Organic Cafe & Bakery',
    title: '₹100 Off Organic Farm-to-Table Meals',
    description: 'Enjoy delicious farm-fresh organic meals served in 100% biodegradable palm leafware.',
    reward_category: 'food',
    credits_required: 150,
    discount_value: '₹100 OFF',
    voucher_type: 'discount',
    terms: 'Valid on bills above ₹299 at Jubilee Hills & Gachibowli outlets.',
    expiry_date: '31/12/2026',
    redemption_limit: 5,
    stock: 50,
    active: true,
    sponsored_type: 'partner',
    city_scope: 'Hyderabad',
  },
  {
    id: 'rew-2',
    partner_id: 'part-2',
    partner_name: 'Green Basket Organics',
    title: '₹150 Off Plastic-Free Organic Groceries',
    description: 'Delivered directly to your doorstep in zero-plastic cotton mesh bags.',
    reward_category: 'shopping',
    credits_required: 250,
    discount_value: '₹150 OFF',
    voucher_type: 'voucher',
    terms: 'Valid on cart value above ₹499 across Telangana.',
    expiry_date: '31/12/2026',
    redemption_limit: 3,
    stock: 40,
    active: true,
    sponsored_type: 'sponsored',
    city_scope: 'Telangana',
  },
  {
    id: 'rew-3',
    partner_id: 'part-3',
    partner_name: 'Cinepolis Eco Cinema',
    title: 'Buy-1-Get-1 Free Movie Ticket Pass',
    description: 'Show your commitment to sustainability and get a free movie ticket on weekday shows.',
    reward_category: 'entertainment',
    credits_required: 300,
    discount_value: 'BOGO PASS',
    voucher_type: 'digital_coupon',
    terms: 'Valid Monday to Thursday on all standard screens nationwide.',
    expiry_date: '31/12/2026',
    redemption_limit: 2,
    stock: 30,
    active: true,
    sponsored_type: 'partner',
    city_scope: 'Pan-India',
  },
  {
    id: 'rew-4',
    partner_id: 'part-4',
    partner_name: 'Campus Green Student Club',
    title: 'Flat 50% Off Sustainability Certification Course',
    description: 'Gain certified credits in Urban Solid Waste Management & Circular Economy.',
    reward_category: 'student',
    credits_required: 200,
    discount_value: '50% OFF',
    voucher_type: 'discount',
    terms: 'Requires valid college student ID verification on enrollment.',
    expiry_date: '31/12/2026',
    redemption_limit: 1,
    stock: 100,
    active: true,
    sponsored_type: 'organic',
    city_scope: 'Pan-India',
  },
  {
    id: 'rew-5',
    partner_id: 'part-5',
    partner_name: 'Green Mobility EV Fleet',
    title: '₹75 Off Electric Scooter Rental',
    description: 'Zero-emission urban commuting across Hyderabad metro stations.',
    reward_category: 'travel',
    credits_required: 120,
    discount_value: '₹75 OFF',
    voucher_type: 'partner_offer',
    terms: 'Valid on EV scooter rentals reserved via EcoScan App.',
    expiry_date: '31/12/2026',
    redemption_limit: 5,
    stock: 60,
    active: true,
    sponsored_type: 'sponsored',
    city_scope: 'Hyderabad',
  },
  {
    id: 'rew-6',
    partner_id: 'part-6',
    partner_name: 'Phool Natural Upcycled Floral Products',
    title: '₹150 Off Temple-Flower Recycled Incense Kit',
    description: 'Handcrafted charcoal-free organic incense upcycled from sacred temple flowers.',
    reward_category: 'eco',
    credits_required: 180,
    discount_value: '₹150 OFF',
    voucher_type: 'voucher',
    terms: 'Valid on all online orders above ₹399 with doorstep delivery.',
    expiry_date: '31/12/2026',
    redemption_limit: 3,
    stock: 75,
    active: true,
    sponsored_type: 'partner',
    city_scope: 'Online-Only',
  },
  {
    id: 'rew-7',
    partner_id: 'part-7',
    partner_name: 'Charminar Artisan Eco-Crafts',
    title: 'Free Handloom Jute Shopping Bag',
    description: 'Claim a sturdy, hand-woven jute bag crafted by local Hyderabad artisan guilds.',
    reward_category: 'local',
    credits_required: 100,
    discount_value: 'FREE GIFT',
    voucher_type: 'local_reward',
    terms: 'Present EcoScan voucher code at Shilparamam or Old City artisan counter.',
    expiry_date: '31/12/2026',
    redemption_limit: 2,
    stock: 25,
    active: true,
    sponsored_type: 'organic',
    city_scope: 'Hyderabad',
  },
];

const INITIAL_PICKUPS: DbPickupRequest[] = [
  {
    id: 'pick-101',
    user_id: 'usr_aditi',
    user_name: 'Aditi Rao',
    user_phone: '+91 98450 12345',
    collector_id: 'col-1',
    collector_name: 'Raju Kumar (Green Earth Kabadiwala Hub)',
    waste_category: 'Cardboard & Appliances',
    items_summary: 'Corrugated Cartons + Old Iron Rods',
    estimated_weight: 12.0,
    estimated_value: 280.0,
    actual_weight: 13.5,
    final_value: 315.0,
    pickup_address: 'Flat 402, Green Meadows, 12th Main, Indiranagar, Bengaluru',
    latitude: 12.9716,
    longitude: 77.6412,
    preferred_date: 'Today',
    preferred_time: '10:30 AM',
    status: 'COMPLETED',
    otp: '4829',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    completed_at: new Date(Date.now() - 2 * 86400000 + 7200000).toISOString(),
  },
  {
    id: 'pick-102',
    user_id: 'usr_aditi',
    user_name: 'Aditi Rao',
    user_phone: '+91 98450 12345',
    collector_id: 'col-1',
    collector_name: 'Raju Kumar (Green Earth Kabadiwala Hub)',
    waste_category: 'Plastic & Metal',
    items_summary: 'PET Plastic Bottles (5kg) + Aluminium Cans',
    estimated_weight: 7.5,
    estimated_value: 235.0,
    pickup_address: 'Flat 402, Green Meadows, 12th Main, Indiranagar, Bengaluru',
    latitude: 12.9716,
    longitude: 77.6412,
    preferred_date: 'Tomorrow',
    preferred_time: '11:00 AM',
    status: 'ACCEPTED',
    otp: '7193',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

const INITIAL_PAYMENTS: DbPayment[] = [
  {
    id: 'pay-101',
    pickup_id: 'pick-101',
    user_id: 'usr_aditi',
    collector_id: 'col-1',
    amount: 315.0,
    payment_method: 'UPI',
    payment_status: 'PAID',
    transaction_reference: 'UPI/DEMO/ECO948293182',
    created_at: new Date(Date.now() - 2 * 86400000 + 7200000).toISOString(),
  },
];

const INITIAL_TRANSACTIONS: DbEcoTransaction[] = [
  {
    id: 'tx-101',
    user_id: 'usr_aditi',
    type: 'EARNED',
    credits: 50,
    source: 'Doorstep Pickup #pick-101 (13.5 kg recycled)',
    reference_id: 'pick-101',
    created_at: new Date(Date.now() - 2 * 86400000 + 7200000).toISOString(),
  },
];

export class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadDatabase();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
        return {
          users: parsed.users || INITIAL_USERS,
          waste_scans: parsed.waste_scans || [],
          waste_materials: parsed.waste_materials || INITIAL_MATERIALS,
          collectors: parsed.collectors || INITIAL_COLLECTORS,
          pickup_requests: parsed.pickup_requests || INITIAL_PICKUPS,
          pickup_locations: parsed.pickup_locations || [],
          payments: parsed.payments || INITIAL_PAYMENTS,
          eco_transactions: parsed.eco_transactions || INITIAL_TRANSACTIONS,
          rewards: (parsed.rewards as unknown as DbRewardItem[]) || INITIAL_REWARDS,
          reward_redemptions: parsed.reward_redemptions || [],
          partners: parsed.partners || INITIAL_PARTNERS,
          notifications: parsed.notifications || [],
        };
      }
    } catch (err) {
      console.error('[DB] Error loading database file, initializing defaults:', err);
    }

    const initial: DatabaseSchema = {
      users: INITIAL_USERS,
      waste_scans: [],
      waste_materials: INITIAL_MATERIALS,
      collectors: INITIAL_COLLECTORS,
      pickup_requests: INITIAL_PICKUPS,
      pickup_locations: [],
      payments: INITIAL_PAYMENTS,
      eco_transactions: INITIAL_TRANSACTIONS,
      rewards: INITIAL_REWARDS,
      reward_redemptions: [],
      partners: INITIAL_PARTNERS,
      notifications: [],
    };
    this.persist(initial);
    return initial;
  }

  private persist(schema?: DatabaseSchema): void {
    const toWrite = schema || this.data;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      // Atomic write using a temp file then rename
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(toWrite, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('[DB] Failed to persist database:', err);
    }
  }

  // --- Users ---
  getUsers(): DbUser[] {
    return this.data.users;
  }

  getUserById(id: string): DbUser | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  getUserByEmail(email: string): DbUser | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  saveUser(user: DbUser): DbUser {
    const index = this.data.users.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      this.data.users[index] = user;
    } else {
      this.data.users.unshift(user);
    }
    this.persist();
    return user;
  }

  // --- Waste Scans ---
  getScans(userId?: string): DbWasteScan[] {
    if (userId) {
      return this.data.waste_scans.filter((s) => s.user_id === userId);
    }
    return this.data.waste_scans;
  }

  addScan(scan: DbWasteScan): DbWasteScan {
    this.data.waste_scans.unshift(scan);
    this.persist();
    return scan;
  }

  // --- Waste Materials ---
  getMaterials(): DbWasteMaterial[] {
    return this.data.waste_materials;
  }

  getMaterialById(id: string): DbWasteMaterial | undefined {
    return this.data.waste_materials.find((m) => m.id === id);
  }

  updateMaterial(id: string, updates: Partial<DbWasteMaterial>): DbWasteMaterial | null {
    const index = this.data.waste_materials.findIndex((m) => m.id === id);
    if (index === -1) return null;
    this.data.waste_materials[index] = {
      ...this.data.waste_materials[index],
      ...updates,
      last_updated: new Date().toISOString(),
    };
    this.persist();
    return this.data.waste_materials[index];
  }

  addMaterial(material: DbWasteMaterial): DbWasteMaterial {
    this.data.waste_materials.push(material);
    this.persist();
    return material;
  }

  // --- Collectors ---
  getCollectors(): DbCollector[] {
    return this.data.collectors;
  }

  getCollectorById(id: string): DbCollector | undefined {
    return this.data.collectors.find((c) => c.id === id);
  }

  getCollectorByUserId(userId: string): DbCollector | undefined {
    return this.data.collectors.find((c) => c.user_id === userId);
  }

  saveCollector(collector: DbCollector): DbCollector {
    const index = this.data.collectors.findIndex((c) => c.id === collector.id);
    if (index >= 0) {
      this.data.collectors[index] = collector;
    } else {
      this.data.collectors.push(collector);
    }
    this.persist();
    return collector;
  }

  updateCollectorStatus(
    id: string,
    status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED'
  ): DbCollector | null {
    const col = this.getCollectorById(id);
    if (!col) return null;
    col.verification_status = status;
    this.persist();
    return col;
  }

  // --- Pickup Requests ---
  getPickups(filter?: { userId?: string; collectorId?: string; status?: PickupStatus }): DbPickupRequest[] {
    let list = [...this.data.pickup_requests];
    if (filter?.userId) {
      list = list.filter((p) => p.user_id === filter.userId);
    }
    if (filter?.collectorId) {
      list = list.filter((p) => p.collector_id === filter.collectorId);
    }
    if (filter?.status) {
      list = list.filter((p) => p.status === filter.status);
    }
    return list;
  }

  getPickupById(id: string): DbPickupRequest | undefined {
    return this.data.pickup_requests.find((p) => p.id === id);
  }

  createPickup(pickup: DbPickupRequest): DbPickupRequest {
    const existingIndex = this.data.pickup_requests.findIndex((p) => p.id === pickup.id);
    if (existingIndex >= 0) {
      this.data.pickup_requests[existingIndex] = pickup;
    } else {
      this.data.pickup_requests.unshift(pickup);
    }
    this.persist();
    return pickup;
  }

  updatePickup(id: string, updates: Partial<DbPickupRequest>): DbPickupRequest | null {
    const index = this.data.pickup_requests.findIndex((p) => p.id === id);
    if (index === -1) return null;
    this.data.pickup_requests[index] = {
      ...this.data.pickup_requests[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.persist();
    return this.data.pickup_requests[index];
  }

  // --- Pickup Live Location Tracking ---
  getPickupLocation(pickupId: string): DbPickupLocation | undefined {
    if (!this.data.pickup_locations) this.data.pickup_locations = [];
    return [...this.data.pickup_locations]
      .reverse()
      .find((l) => l.pickup_id === pickupId && l.tracking_active);
  }

  getPickupLocationRaw(pickupId: string): DbPickupLocation | undefined {
    if (!this.data.pickup_locations) this.data.pickup_locations = [];
    return [...this.data.pickup_locations].reverse().find((l) => l.pickup_id === pickupId);
  }

  updatePickupLocation(data: {
    pickup_id: string;
    collector_id: string;
    latitude: number;
    longitude: number;
    tracking_active?: boolean;
  }): DbPickupLocation {
    if (!this.data.pickup_locations) this.data.pickup_locations = [];
    const index = this.data.pickup_locations.findIndex((l) => l.pickup_id === data.pickup_id);
    const updated: DbPickupLocation = {
      pickup_id: data.pickup_id,
      collector_id: data.collector_id,
      latitude: data.latitude,
      longitude: data.longitude,
      updated_at: new Date().toISOString(),
      tracking_active: data.tracking_active !== undefined ? data.tracking_active : true,
    };
    if (index >= 0) {
      this.data.pickup_locations[index] = updated;
    } else {
      this.data.pickup_locations.push(updated);
    }
    this.persist();
    return updated;
  }

  stopPickupLocationTracking(pickupId: string): void {
    if (!this.data.pickup_locations) return;
    const loc = this.data.pickup_locations.find((l) => l.pickup_id === pickupId);
    if (loc) {
      loc.tracking_active = false;
      loc.updated_at = new Date().toISOString();
      this.persist();
    }
  }

  // --- Payments ---
  getPayments(userId?: string): DbPayment[] {
    if (userId) {
      return this.data.payments.filter((p) => p.user_id === userId);
    }
    return this.data.payments;
  }

  addPayment(payment: DbPayment): DbPayment {
    this.data.payments.unshift(payment);
    this.persist();
    return payment;
  }

  // --- Eco Transactions ---
  getEcoTransactions(userId?: string): DbEcoTransaction[] {
    if (userId) {
      return this.data.eco_transactions.filter((t) => t.user_id === userId);
    }
    return this.data.eco_transactions;
  }

  hasEcoCreditForReference(userId: string, refId: string): boolean {
    return this.data.eco_transactions.some(
      (t) => t.user_id === userId && t.reference_id === refId && t.type === 'EARNED'
    );
  }

  getUserLedgerBalance(userId: string): number {
    const txs = this.getEcoTransactions(userId);
    let balance = 0;
    for (const tx of txs) {
      if (tx.type === 'EARNED' || tx.type === 'BONUS' || tx.type === 'ADJUSTMENT') {
        balance += (tx.credits || tx.amount || 0);
      } else if (tx.type === 'REDEEMED') {
        balance -= (tx.credits || tx.amount || 0);
      } else if (tx.type === 'REVERSAL') {
        balance += (tx.credits || tx.amount || 0);
      }
    }
    return Math.max(0, balance);
  }

  addEcoTransaction(tx: DbEcoTransaction): DbEcoTransaction {
    if (!this.data.eco_transactions) this.data.eco_transactions = [];
    this.data.eco_transactions.unshift(tx);
    // Recalculate user balance strictly from credit ledger
    const user = this.getUserById(tx.user_id);
    if (user) {
      user.eco_credits = this.getUserLedgerBalance(tx.user_id);
      this.saveUser(user);
    } else {
      this.persist();
    }
    return tx;
  }

  // --- Partners ---
  getPartners(status?: PartnershipStatus, verifiedOnly?: boolean): DbPartner[] {
    let list = this.data.partners || INITIAL_PARTNERS;
    if (status) {
      list = list.filter((p) => p.partnership_status === status);
    }
    if (verifiedOnly) {
      list = list.filter((p) => (p.verified_status || p.verified_badge) && p.active);
    }
    return list;
  }

  getPartnerById(id: string): DbPartner | undefined {
    const list = this.data.partners || INITIAL_PARTNERS;
    return list.find((p) => p.id === id);
  }

  savePartner(partner: DbPartner): DbPartner {
    if (!this.data.partners) this.data.partners = [...INITIAL_PARTNERS];
    const index = this.data.partners.findIndex((p) => p.id === partner.id);
    if (index >= 0) {
      this.data.partners[index] = partner;
    } else {
      this.data.partners.unshift(partner);
    }
    this.persist();
    return partner;
  }

  updatePartnerStatus(id: string, status: PartnershipStatus, verified?: boolean): DbPartner | null {
    if (!this.data.partners) this.data.partners = [...INITIAL_PARTNERS];
    const partner = this.data.partners.find((p) => p.id === id);
    if (!partner) return null;
    partner.partnership_status = status;
    if (verified !== undefined) {
      partner.verified_status = verified;
      partner.verified_badge = verified;
    }
    partner.active = status === 'Active' && (partner.verified_status || partner.verified_badge || false);
    this.persist();
    return partner;
  }

  // --- Rewards ---
  getRewards(category?: string, partnerId?: string, activeOnly = true): DbRewardItem[] {
    let list = (this.data.rewards as unknown as DbRewardItem[]) || INITIAL_REWARDS;
    if (activeOnly) {
      list = list.filter((r) => r.active !== false && r.is_active !== false);
    }
    if (category && category !== 'all' && category !== 'claimed') {
      list = list.filter((r) => r.reward_category === category || r.category === category || r.partner_id === category);
    }
    if (partnerId) {
      list = list.filter((r) => r.partner_id === partnerId);
    }
    return list;
  }

  getRewardById(id: string): DbRewardItem | undefined {
    const list = (this.data.rewards as unknown as DbRewardItem[]) || INITIAL_REWARDS;
    return list.find((r) => r.id === id);
  }

  addReward(reward: DbRewardItem): DbRewardItem {
    if (!this.data.rewards) this.data.rewards = [...INITIAL_REWARDS] as any;
    (this.data.rewards as unknown as DbRewardItem[]).unshift(reward);
    this.persist();
    return reward;
  }

  updateReward(id: string, updates: Partial<DbRewardItem>): DbRewardItem | null {
    if (!this.data.rewards) this.data.rewards = [...INITIAL_REWARDS] as any;
    const list = this.data.rewards as unknown as DbRewardItem[];
    const index = list.findIndex((r) => r.id === id);
    if (index === -1) return null;
    list[index] = { ...list[index], ...updates };
    this.persist();
    return list[index];
  }

  // --- Server-Side Atomic Reward Redemption with Provider Fulfillment & Automatic Reversal ---
  async redeemRewardAtomicAsync(userId: string, rewardId: string): Promise<{ redemption: DbRewardRedemption; remaining_credits: number }> {
    const user = this.getUserById(userId);
    const reward = this.getRewardById(rewardId);

    if (!user) {
      throw new Error('User account not found');
    }
    if (!reward) {
      throw new Error('Selected reward does not exist');
    }
    if (reward.active === false || reward.is_active === false) {
      throw new Error('This partner reward is currently paused or inactive');
    }
    if (reward.is_verified === false) {
      throw new Error('This reward is unverified and unavailable for redemption');
    }
    if (reward.stock !== undefined && reward.stock <= 0) {
      throw new Error('This reward is currently out of stock');
    }

    const currentLedgerBalance = this.getUserLedgerBalance(userId);
    if (currentLedgerBalance < reward.credits_required) {
      throw new Error(`Insufficient Eco Credits! Required: ${reward.credits_required}, Your Ledger Balance: ${currentLedgerBalance}`);
    }

    const redemptionId = `red_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // 1. Temporarily reserve stock & log REDEEMED entry in ledger
    if (reward.stock && reward.stock > 0) {
      reward.stock -= 1;
      this.updateReward(reward.id, { stock: reward.stock });
    }

    const redeemTx: DbEcoTransaction = {
      id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      user_id: user.id,
      type: 'REDEEMED',
      credits: reward.credits_required,
      amount: reward.credits_required,
      source: `Redeemed ${reward.partner_name} (${reward.title || reward.reward_title})`,
      reference_id: redemptionId,
      description: `Voucher redemption for ${reward.title || reward.reward_title}`,
      created_at: new Date().toISOString(),
    };
    this.addEcoTransaction(redeemTx);

    // 2. Fulfill via Digital Reward Provider
    const fulfillment = await rewardProvider.fulfillReward({
      redemptionId,
      userId: user.id,
      providerRewardId: reward.provider_reward_id,
      provider: reward.provider || (reward.redemption_method === 'PROVIDER_API' ? 'xoxoday' : 'partner_direct'),
      creditsSpent: reward.credits_required,
      rewardValue: reward.discount_value || reward.reward_value,
      userEmail: user.email,
      userPhone: user.phone,
      partnerId: reward.partner_id,
      codeTemplate: reward.code_template,
    });

    // 3. Handle Provider Fulfillment Failure (AUTOMATIC ROLLBACK & CREDIT REVERSAL)
    if (!fulfillment.success) {
      // Rollback stock
      if (reward.stock !== undefined) {
        reward.stock += 1;
        this.updateReward(reward.id, { stock: reward.stock });
      }

      // Record REVERSAL ledger entry to restore credits
      const reversalTx: DbEcoTransaction = {
        id: `tx_rev_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        user_id: user.id,
        type: 'REVERSAL',
        credits: reward.credits_required,
        amount: reward.credits_required,
        source: `Refund for failed redemption (${reward.partner_name})`,
        reference_id: redemptionId,
        description: fulfillment.errorMessage || 'Provider fulfillment error refund',
        created_at: new Date().toISOString(),
      };
      this.addEcoTransaction(reversalTx);

      // Record FAILED redemption
      const failedRedemption: DbRewardRedemption = {
        id: redemptionId,
        user_id: user.id,
        reward_id: reward.id,
        partner_id: reward.partner_id,
        partner_name: reward.partner_name,
        reward_title: reward.title || reward.reward_title,
        discount_value: reward.discount_value || reward.reward_value,
        credits_spent: reward.credits_required,
        credits_used: reward.credits_required,
        redemption_code: 'FAILED',
        redemption_date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        redeemed_at: new Date().toISOString(),
        expiry_date: reward.expiry_date || '31/12/2026',
        expires_at: reward.expiry_date,
        status: 'FAILED',
        redemption_status: 'FAILED',
        redemption_instructions: fulfillment.errorMessage,
      };
      if (!this.data.reward_redemptions) this.data.reward_redemptions = [];
      this.data.reward_redemptions.unshift(failedRedemption);
      this.persist();

      throw new Error(fulfillment.errorMessage || 'Reward provider fulfillment failed. Credits refunded to wallet.');
    }

    // 4. Provider Fulfillment Succeeded: Log COMPLETED redemption
    const redemption: DbRewardRedemption = {
      id: redemptionId,
      user_id: user.id,
      reward_id: reward.id,
      partner_id: reward.partner_id,
      partner_name: reward.partner_name,
      reward_title: reward.title || reward.reward_title,
      discount_value: reward.discount_value || reward.reward_value,
      credits_spent: reward.credits_required,
      credits_used: reward.credits_required,
      provider: reward.provider || 'PARTNER',
      provider_transaction_id: fulfillment.providerTransactionId,
      voucher_code: fulfillment.voucherCode || 'VOUCHER',
      voucher_pin: fulfillment.voucherPin,
      redemption_code: fulfillment.voucherCode || 'VOUCHER',
      redemption_date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      redeemed_at: new Date().toISOString(),
      expiry_date: reward.expiry_date || '31/12/2026',
      expires_at: fulfillment.expiresAt || reward.expiry_date,
      status: 'COMPLETED',
      redemption_status: 'ACTIVE',
      how_to_redeem: reward.terms,
      redemption_instructions: fulfillment.instructions || reward.terms,
    };

    if (!this.data.reward_redemptions) this.data.reward_redemptions = [];
    this.data.reward_redemptions.unshift(redemption);

    this.addNotification({
      id: `notif_${Date.now()}`,
      user_id: user.id,
      title: `Voucher Unlocked: ${reward.partner_name}`,
      message: `You successfully redeemed ${reward.title || reward.reward_title} for ${reward.credits_required} Eco Credits. Code: ${redemption.voucher_code}`,
      type: 'REDEEMED',
      read: false,
      created_at: new Date().toISOString(),
    });

    this.persist();
    const updatedBalance = this.getUserLedgerBalance(user.id);
    return { redemption, remaining_credits: updatedBalance };
  }

  redeemRewardAtomic(userId: string, rewardId: string): { redemption: DbRewardRedemption; remaining_credits: number } {
    const user = this.getUserById(userId);
    const reward = this.getRewardById(rewardId);

    if (!user) throw new Error('User account not found');
    if (!reward) throw new Error('Selected reward does not exist');

    const code = `ECO-${Math.floor(100000 + Math.random() * 900000)}`;
    const redemption: DbRewardRedemption = {
      id: `red_${Date.now()}`,
      user_id: user.id,
      reward_id: reward.id,
      partner_id: reward.partner_id,
      partner_name: reward.partner_name,
      reward_title: reward.title,
      discount_value: reward.discount_value,
      credits_spent: reward.credits_required,
      credits_used: reward.credits_required,
      redemption_code: code,
      voucher_code: code,
      redemption_date: new Date().toLocaleDateString('en-IN'),
      expiry_date: reward.expiry_date || '31/12/2026',
      status: 'COMPLETED',
      redemption_status: 'ACTIVE',
    };
    return { redemption, remaining_credits: user.eco_credits };
  }

  // --- Partner Verification of Redemption Code ---
  verifyRedemptionCode(code: string, partnerId?: string): { success: boolean; redemption?: DbRewardRedemption; message: string } {
    if (!this.data.reward_redemptions) return { success: false, message: 'No redemptions found' };
    const cleanCode = code.trim().toUpperCase();
    const redemption = this.data.reward_redemptions.find((r) => r.redemption_code.toUpperCase() === cleanCode);

    if (!redemption) {
      return { success: false, message: 'Invalid redemption code' };
    }
    if (partnerId && redemption.partner_id !== partnerId) {
      return { success: false, message: 'This redemption code belongs to another partner' };
    }
    if (redemption.redemption_status === 'USED') {
      return { success: false, redemption, message: `Code was already used on ${redemption.used_at || 'earlier date'}` };
    }
    if (redemption.redemption_status === 'EXPIRED') {
      return { success: false, redemption, message: 'This redemption code has expired' };
    }

    // Mark as USED
    redemption.redemption_status = 'USED';
    redemption.used_at = new Date().toISOString();
    this.persist();

    return { success: true, redemption, message: `Successfully verified and redeemed code ${cleanCode}!` };
  }

  // --- Partner Dashboard Analytics ---
  getPartnerDashboardData(partnerId: string): PartnerDashboardData | null {
    const partner = this.getPartnerById(partnerId);
    if (!partner) return null;

    const rewards = this.getRewards(undefined, partnerId, false);
    const redemptions = (this.data.reward_redemptions || []).filter((r) => r.partner_id === partnerId);
    const activeVouchers = redemptions.filter((r) => r.redemption_status === 'ACTIVE').length;
    const usedVouchers = redemptions.filter((r) => r.redemption_status === 'USED').length;
    const creditsRedeemed = redemptions.reduce((acc, r) => acc + (r.credits_used || 0), 0);
    const totalViews = Math.max(redemptions.length * 4 + 12, 25);

    return {
      partner,
      rewards,
      redemptions,
      totalViews,
      totalRedemptions: redemptions.length,
      activeVouchers,
      usedVouchers,
      creditsRedeemed,
      conversionRatePct: totalViews > 0 ? Number(((redemptions.length / totalViews) * 100).toFixed(1)) : 0,
    };
  }

  // --- Notifications ---
  getNotifications(userId: string, recipientRole?: RecipientRole): DbNotification[] {
    if (!this.data.notifications) this.data.notifications = [];
    return this.data.notifications.filter((n) => {
      const targetRole = n.recipient_role || 'user';
      // Role isolation: If role is specified, strictly filter out other role notifications
      if (recipientRole && targetRole !== recipientRole) {
        return false;
      }
      if (n.recipient_id === 'all') return true;
      if (userId && userId !== 'all' && (n.recipient_id === userId || n.user_id === userId)) return true;
      return false;
    });
  }

  getNotificationById(id: string): DbNotification | undefined {
    return this.data.notifications?.find((notification) => notification.id === id);
  }

  addNotification(notif: DbNotification): DbNotification {
    if (!this.data.notifications) this.data.notifications = [];
    if (!notif.recipient_id) notif.recipient_id = notif.user_id;
    if (!notif.recipient_role) notif.recipient_role = 'user';
    if (notif.is_read === undefined) notif.is_read = notif.read || false;
    if (notif.read === undefined) notif.read = notif.is_read || false;
    this.data.notifications.unshift(notif);
    this.persist();
    return notif;
  }

  markNotificationRead(id: string): boolean {
    if (!this.data.notifications) return false;
    const notif = this.data.notifications.find((n) => n.id === id);
    if (!notif) return false;
    notif.read = true;
    notif.is_read = true;
    this.persist();
    return true;
  }

  markAllNotificationsRead(userId: string): boolean {
    if (!this.data.notifications) return false;
    let updated = false;
    for (const n of this.data.notifications) {
      if (n.user_id === userId || n.recipient_id === userId) {
        n.read = true;
        n.is_read = true;
        updated = true;
      }
    }
    if (updated) this.persist();
    return updated;
  }

  // --- User Activity History ---
  getUserActivities(userId: string, filter?: string): DbUserActivity[] {
    if (!this.data.user_activities) this.data.user_activities = [];
    let list = this.data.user_activities.filter((a) => a.user_id === userId);
    if (filter && filter !== 'all') {
      const f = filter.toLowerCase();
      if (f === 'pickups') {
        list = list.filter((a) => a.activity_type.includes('PICKUP') || a.activity_type.includes('COLLECT'));
      } else if (f === 'scans') {
        list = list.filter((a) => a.activity_type === 'WASTE_SCANNED');
      } else if (f === 'credits') {
        list = list.filter((a) => a.activity_type.includes('CREDITS') || a.activity_type.includes('AMOUNT'));
      } else if (f === 'rewards') {
        list = list.filter((a) => a.activity_type === 'REWARD_REDEEMED');
      }
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  addUserActivity(activity: DbUserActivity): DbUserActivity {
    if (!this.data.user_activities) this.data.user_activities = [];
    this.data.user_activities.unshift(activity);
    this.persist();
    return activity;
  }

  // --- Pickup Status Timeline History & OTP Verification ---
  addPickupStatusLog(
    pickupId: string,
    status: PickupStatus,
    title: string,
    note?: string,
    changedBy?: string,
    changedByRole?: RecipientRole | 'system'
  ): DbPickupRequest | null {
    const pickup = this.getPickupById(pickupId);
    if (!pickup) return null;

    if (!pickup.status_history) pickup.status_history = [];

    const oldStatus = pickup.status;
    pickup.status_history.push({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      pickup_id: pickupId,
      old_status: oldStatus,
      new_status: status,
      status,
      title,
      changed_by: changedBy || pickup.collector_id || pickup.user_id,
      changed_by_role: changedByRole || 'system',
      timestamp: new Date().toISOString(),
      note,
    });

    pickup.status = status;
    this.persist();
    return pickup;
  }

  verifyPickupOtp(
    pickupId: string,
    otpInput: string,
    collectorId?: string
  ): { success: boolean; message: string; pickup?: DbPickupRequest } {
    const pickup = this.getPickupById(pickupId);
    if (!pickup) {
      return { success: false, message: 'Pickup request not found.' };
    }

    if (collectorId && pickup.collector_id && pickup.collector_id !== collectorId) {
      return { success: false, message: 'Unauthorized collector for this pickup.' };
    }

    const attempts = (pickup.otp_attempts || 0) + 1;
    pickup.otp_attempts = attempts;

    if (attempts > 5) {
      this.addPickupStatusLog(
        pickupId,
        'FAILED',
        'Pickup Failed - Exceeded Max OTP Attempts',
        'Max 5 OTP attempts exceeded',
        collectorId,
        'collector'
      );
      this.persist();
      return { success: false, message: 'Maximum OTP verification attempts exceeded (5/5). Pickup marked as FAILED.' };
    }

    if (!pickup.otp || pickup.otp.trim() !== otpInput.trim()) {
      this.persist();
      return { success: false, message: `Invalid OTP code. Attempt ${attempts} of 5.` };
    }

    // Success
    pickup.otp_verified_at = new Date().toISOString();
    this.addPickupStatusLog(
      pickupId,
      'OTP_VERIFIED',
      'OTP Verified Successfully',
      'Collector verified customer 4-digit OTP code',
      collectorId,
      'collector'
    );
    this.addPickupStatusLog(
      pickupId,
      'COLLECTING',
      'Waste Collection & Weighing',
      'Collector is weighing and verifying items',
      collectorId,
      'collector'
    );

    this.persist();
    return { success: true, message: 'OTP verified successfully!', pickup };
  }

  regeneratePickupOtp(pickupId: string, userId: string): { success: boolean; message: string; otp?: string } {
    const pickup = this.getPickupById(pickupId);
    if (!pickup) return { success: false, message: 'Pickup request not found' };
    if (pickup.user_id !== userId) return { success: false, message: 'Unauthorized user' };

    const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
    pickup.otp = newOtp;
    pickup.otp_attempts = 0;
    this.addPickupStatusLog(pickupId, pickup.status, 'New OTP Generated', `New security OTP ${newOtp} generated by customer`, userId, 'user');
    this.persist();
    return { success: true, message: `New OTP generated: ${newOtp}`, otp: newOtp };
  }

  cancelPickup(pickupId: string, cancelledBy: string, cancelledByRole: RecipientRole | 'system', reason?: string): DbPickupRequest | null {
    const pickup = this.getPickupById(pickupId);
    if (!pickup) return null;

    pickup.status = 'CANCELLED';
    pickup.cancelled_by = cancelledBy;
    pickup.cancelled_reason = reason || 'Cancelled';
    pickup.cancelled_at = new Date().toISOString();
    this.addPickupStatusLog(pickupId, 'CANCELLED', 'Pickup Cancelled', reason || 'Cancelled', cancelledBy, cancelledByRole);
    this.persist();
    return pickup;
  }

  addPickupRating(rating: DbPickupRating): DbPickupRating {
    if (!this.data.pickup_ratings) this.data.pickup_ratings = [];
    this.data.pickup_ratings.unshift(rating);

    const pickup = this.getPickupById(rating.pickup_id);
    if (pickup) {
      pickup.rating = rating.rating;
      pickup.review = rating.review;
      pickup.rating_created_at = rating.created_at;
    }

    if (rating.collector_id) {
      const col = this.getCollectorById(rating.collector_id);
      if (col) {
        const colRatings = this.data.pickup_ratings.filter((r) => r.collector_id === rating.collector_id);
        const avg = colRatings.reduce((sum, r) => sum + r.rating, 0) / colRatings.length;
        col.rating = Number(avg.toFixed(1));
        this.saveCollector(col);
      }
    }

    this.persist();
    return rating;
  }

  // --- Reward Redemptions ---
  getRedemptions(userId?: string): DbRewardRedemption[] {
    if (userId) {
      return (this.data.reward_redemptions || []).filter((r) => r.user_id === userId);
    }
    return this.data.reward_redemptions || [];
  }

  addRedemption(redemption: DbRewardRedemption): DbRewardRedemption {
    if (!this.data.reward_redemptions) this.data.reward_redemptions = [];
    this.data.reward_redemptions.unshift(redemption);
    this.persist();
    return redemption;
  }

  // --- Admin Stats ---
  getAdminStats() {
    const totalUsers = this.data.users.length;
    const totalCollectors = this.data.collectors.length;
    const verifiedCollectors = this.data.collectors.filter((c) => c.verification_status === 'VERIFIED').length;
    const totalPickups = this.data.pickup_requests.length;
    const completedPickups = this.data.pickup_requests.filter((p) => p.status === 'COMPLETED').length;

    let totalWasteRecycled = 0;
    for (const p of this.data.pickup_requests) {
      if (p.status === 'COMPLETED') {
        totalWasteRecycled += p.actual_weight || p.estimated_weight || 0;
      }
    }

    let totalTransactionValue = 0;
    for (const pay of this.data.payments) {
      if (pay.payment_status === 'PAID') {
        totalTransactionValue += pay.amount;
      }
    }

    let ecoCreditsIssued = 0;
    for (const tx of this.data.eco_transactions) {
      if (tx.type === 'EARNED') {
        ecoCreditsIssued += tx.credits;
      }
    }

    const partnersList = this.data.partners || INITIAL_PARTNERS;
    const totalPartners = partnersList.length;
    const activePartners = partnersList.filter((p) => p.active && p.verified_status).length;
    const prospectPartners = partnersList.filter((p) => p.partnership_status === 'Prospect' || p.partnership_status === 'Contacted' || p.partnership_status === 'Negotiating').length;

    const rewardsList = (this.data.rewards as unknown as DbRewardItem[]) || INITIAL_REWARDS;
    const activeRewards = rewardsList.filter((r) => r.active).length;

    const redemptionsList = this.data.reward_redemptions || [];
    const totalRedemptions = redemptionsList.length;
    const creditsRedeemed = redemptionsList.reduce((sum, r) => sum + (r.credits_used || 0), 0);

    // Waste by category aggregation
    const wasteByCategory: Record<string, number> = {};
    for (const p of this.data.pickup_requests) {
      const cat = p.waste_category || 'Assorted';
      wasteByCategory[cat] = (wasteByCategory[cat] || 0) + (p.actual_weight || p.estimated_weight || 0);
    }

    return {
      totalUsers,
      totalCollectors,
      verifiedCollectors,
      totalPickups,
      completedPickups,
      totalWasteRecycled: Number(totalWasteRecycled.toFixed(1)),
      totalTransactionValue: Math.round(totalTransactionValue),
      ecoCreditsIssued,
      activeRewards,
      totalPartners,
      activePartners,
      prospectPartners,
      totalRedemptions,
      creditsRedeemed,
      wasteByCategory,
      recentPickups: this.data.pickup_requests.slice(0, 8),
      recentPayments: this.data.payments.slice(0, 8),
      recentRedemptions: redemptionsList.slice(0, 8),
    };
  }
}

export const db = new Database();
