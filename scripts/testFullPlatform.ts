import { DbService, prisma } from '../server/services/dbService';
import { RewardsService } from '../server/services/rewardsService';
import { hashPassword } from '../server/middleware/auth';
import { DbUser, DbCollector, DbPickupRequest } from '../server/db';

async function runPlatformTests() {
  console.log('--- STARTING FULL ECOSCAN PLATFORM & REWARDS SYSTEM INTEGRATION TESTS ---');

  // 1. Seed Check & Point Rules Verification
  await DbService.seedDefaultDataIfEmpty();
  const materials = await DbService.getMaterials();
  const pointRules = await DbService.getPointRules();
  console.log(`✔ DbService materials loaded: ${materials.length} categories.`);
  console.log(`✔ DbService point rules loaded: ${pointRules.length} rules.`);
  if (materials.length === 0 || pointRules.length === 0) throw new Error('Materials or PointRules failed to seed.');

  // 2. User & Collector Auth Chain Test
  const testEmail = `integration_usr_${Date.now()}@ecoscan.in`;
  const passHash = await hashPassword('EcoScanTestPass123!');
  const userId = `usr_test_${Date.now()}`;

  const userPhone = `+91 ${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  const userPayload: DbUser = {
    id: userId,
    name: 'Integration Test User',
    email: testEmail,
    phone: userPhone,
    password_hash: passHash,
    role: 'user',
    address: 'Indiranagar, Bengaluru, KA',
    eco_credits: 100, // Initial balance 100
    total_waste_recycled: 0,
    total_earnings: 0,
    profile_image: '',
    created_at: new Date().toISOString(),
  };

  const createdUser = await DbService.saveUser(userPayload);
  console.log(`✔ User registered: ${createdUser.id} (${createdUser.email}), initial balance: ${createdUser.eco_credits}`);

  // 3. Collector Profile Creation
  const colUserId = `usr_col_${Date.now()}`;
  const colId = `col_test_${Date.now()}`;
  const colPhone = `+91 ${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  const colPayload: DbCollector = {
    id: colId,
    user_id: colUserId,
    name: 'Test Kabadiwala Hub',
    phone: colPhone,
    verification_status: 'VERIFIED',
    service_area: 'Indiranagar & HSR Layout',
    latitude: 12.9716,
    longitude: 77.6412,
    available: true,
    rating: 5.0,
    total_pickups: 0,
    total_earnings: 0,
  };

  const createdCol = await DbService.saveCollector(colPayload);
  console.log(`✔ Collector registered: ${createdCol.id} for user ${createdCol.user_id}`);

  // 4. Pickup Lifecycle & State Machine Test
  const pickupId = `ES-TEST-${Date.now()}`;
  const pickupPayload: DbPickupRequest = {
    id: pickupId,
    user_id: createdUser.id,
    user_name: createdUser.name,
    user_phone: createdUser.phone,
    collector_id: createdCol.id,
    collector_name: createdCol.name,
    waste_category: 'Plastic',
    items_summary: 'Sorted PET Bottles (5kg)',
    estimated_weight: 5.0,
    estimated_value: 175.0,
    pickup_address: createdUser.address,
    latitude: 12.9716,
    longitude: 77.6412,
    preferred_date: 'Today',
    preferred_time: '11:00 AM',
    status: 'REQUESTED',
    otp: '1234',
    created_at: new Date().toISOString(),
  };

  const createdPickup = await DbService.createPickup(pickupPayload);
  console.log(`✔ Pickup created: ${createdPickup.id}, Status: ${createdPickup.status}`);

  // 5. State Transition & Completion
  await DbService.updatePickup(pickupId, { status: 'ACCEPTED' });
  await DbService.updatePickup(pickupId, { status: 'ON_THE_WAY' });
  await DbService.addPickupStatusLog(pickupId, 'OTP_VERIFIED', 'OTP Verified', 'Verified OTP', createdCol.id, 'collector');
  await DbService.updatePickup(pickupId, { actual_weight: 5.0, rate_per_kg: 35.0, final_value: 175.0, status: 'WEIGHED' });
  await DbService.updatePickup(pickupId, { status: 'COMPLETED', completed_at: new Date().toISOString() });

  // 6. Test RewardsService.awardPickupPoints (Idempotent Point Issuance)
  const award1 = await RewardsService.awardPickupPoints(createdUser.id, pickupId, 'Plastic', 5.0);
  console.log(`✔ RewardsService.awardPickupPoints (first attempt): earned +${award1.pointsEarned} EcoCredits. Already awarded? ${award1.alreadyAwarded}`);
  if (award1.alreadyAwarded) throw new Error('First point awarding should not mark as already awarded!');

  const award2 = await RewardsService.awardPickupPoints(createdUser.id, pickupId, 'Plastic', 5.0);
  console.log(`✔ RewardsService.awardPickupPoints (second attempt / retry): earned +${award2.pointsEarned} EcoCredits. Already awarded? ${award2.alreadyAwarded}`);
  if (!award2.alreadyAwarded) throw new Error('Second point awarding MUST be idempotent and mark alreadyAwarded = true!');

  const userAfterPickup = await DbService.getUserById(createdUser.id);
  console.log(`✔ User wallet balance after pickup completion: ${userAfterPickup?.eco_credits} credits, waste recycled: ${userAfterPickup?.total_waste_recycled}kg`);

  // 7. Test Reward Item Redemption & Atomic Deduction
  const testPartner = await prisma.partner.findFirst();
  const testReward = await prisma.rewardItem.create({
    data: {
      id: `rw-test-${Date.now()}`,
      partnerId: testPartner?.id || 'part-green-store',
      partnerName: 'Test Coffee Partner',
      title: '₹50 Off Organic Coffee Voucher',
      description: 'Exclusive discount voucher for testing.',
      rewardCategory: 'Food & Beverage',
      creditsRequired: 40,
      discountValue: '₹50 Off',
      rewardType: 'Discount Coupon',
      terms: 'Test terms apply.',
      expiryDate: '2026-12-31',
      stock: 5,
      active: true,
      codeTemplate: 'TEST-XXXXXX',
    },
  });
  console.log(`✔ Test Reward created: ${testReward.id}, required: ${testReward.creditsRequired} credits, stock: ${testReward.stock}`);

  const initialBalance = userAfterPickup?.eco_credits || 0;
  const redemptionResult = await RewardsService.redeemReward(createdUser.id, testReward.id);
  console.log(`✔ RewardsService.redeemReward result: success=${redemptionResult.success}, voucherCode=${redemptionResult.redemption?.voucherCode}`);
  if (!redemptionResult.success || !redemptionResult.redemption) throw new Error('Redemption failed!');

  const userAfterRedeem = await DbService.getUserById(createdUser.id);
  const rewardAfterRedeem = await prisma.rewardItem.findUnique({ where: { id: testReward.id } });
  console.log(`✔ User balance after redemption: ${userAfterRedeem?.eco_credits} (Expected: ${initialBalance - 40})`);
  console.log(`✔ Reward stock after redemption: ${rewardAfterRedeem?.stock} (Expected: 4)`);

  if (userAfterRedeem?.eco_credits !== initialBalance - 40) throw new Error('User balance did not deduct correctly!');
  if (rewardAfterRedeem?.stock !== 4) throw new Error('Reward stock did not decrement correctly!');

  // 8. Test Insufficient Balance Handling
  const expensiveReward = await prisma.rewardItem.create({
    data: {
      id: `rw-expensive-${Date.now()}`,
      partnerId: testPartner?.id || 'part-green-store',
      partnerName: 'Luxury Eco Stay',
      title: 'Luxury Eco Resort Stay Voucher',
      description: 'Expensive reward requiring 10,000 points.',
      rewardCategory: 'Travel & Mobility',
      creditsRequired: 10000,
      discountValue: 'Free Stay',
      rewardType: 'Voucher',
      terms: 'Test terms.',
      expiryDate: '2026-12-31',
      stock: 2,
      active: true,
    },
  });

  const failRedemption = await RewardsService.redeemReward(createdUser.id, expensiveReward.id);
  console.log(`✔ Insufficient balance redemption attempt: success=${failRedemption.success}, error="${failRedemption.errorMessage}"`);
  if (failRedemption.success) throw new Error('Redemption with insufficient balance should fail!');

  // 9. Wallet & Eco Impact Summary Test
  const walletSummary = await RewardsService.getWalletAndImpact(createdUser.id);
  console.log(`✔ Wallet & Impact Summary computed:
      EcoCredits: ${walletSummary.ecoCredits}
      Lifetime Earned: ${walletSummary.lifetimeEarned}
      CO2 Offset: ${walletSummary.co2OffsetKg} kg
      Trees Saved: ${walletSummary.treesSaved}
      Water Preserved: ${walletSummary.waterPreservedLiters} L
      Recent Txs: ${walletSummary.recentTransactions.length}
      Active Vouchers: ${walletSummary.activeVouchers.length}
      Achievements: ${walletSummary.achievements.length}`);

  // 10. Admin Stats Check
  const stats = await DbService.getAdminStats();
  console.log(`✔ Admin Stats computed: Total Users=${stats.totalUsers}, Total Pickups=${stats.totalPickups}, Active Rewards=${stats.activeRewards}`);

  console.log('--- ALL ECOSCAN REWARDS SYSTEM INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
}

runPlatformTests()
  .catch((err) => {
    console.error('Integration test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
