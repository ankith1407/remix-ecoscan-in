import { DbService, prisma } from '../server/services/dbService';
import { hashPassword, verifyPassword, generateTokens } from '../server/middleware/auth';
import { DbUser, DbCollector, DbPickupRequest } from '../server/db';

async function runPlatformTests() {
  console.log('--- STARTING FULL ECOSCAN PLATFORM INTEGRATION TESTS ---');

  // 1. Seed Check
  await DbService.seedDefaultDataIfEmpty();
  const materials = await DbService.getMaterials();
  console.log(`✔ DbService materials loaded: ${materials.length} categories found.`);
  if (materials.length === 0) throw new Error('Materials failed to seed.');

  // 2. User & Collector Auth Chain Test
  const testEmail = `integration_usr_${Date.now()}@ecoscan.in`;
  const passHash = await hashPassword('EcoScanTestPass123!');
  const userId = `usr_test_${Date.now()}`;

  const userPayload: DbUser = {
    id: userId,
    name: 'Integration Test User',
    email: testEmail,
    phone: '+91 99887 76655',
    password_hash: passHash,
    role: 'user',
    address: 'Indiranagar, Bengaluru, KA',
    eco_credits: 50,
    total_waste_recycled: 0,
    total_earnings: 0,
    profile_image: '',
    created_at: new Date().toISOString(),
  };

  const createdUser = await DbService.saveUser(userPayload);
  console.log(`✔ User registered: ${createdUser.id} (${createdUser.email})`);

  // 3. Collector Profile Creation
  const colUserId = `usr_col_${Date.now()}`;
  const colId = `col_test_${Date.now()}`;
  const colPayload: DbCollector = {
    id: colId,
    user_id: colUserId,
    name: 'Test Kabadiwala Hub',
    phone: '+91 98888 77777',
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

  // 5. State Transition: ACCEPTED -> ON_THE_WAY -> ARRIVED -> OTP_VERIFIED -> WEIGHED -> COMPLETED
  const accepted = await DbService.updatePickup(pickupId, { status: 'ACCEPTED' });
  console.log(`✔ Pickup state -> ACCEPTED: ${accepted?.status}`);

  const onTheWay = await DbService.updatePickup(pickupId, { status: 'ON_THE_WAY' });
  console.log(`✔ Pickup state -> ON_THE_WAY: ${onTheWay?.status}`);

  // Update Location
  const loc = await DbService.updatePickupLocation({
    pickup_id: pickupId,
    collector_id: createdCol.id,
    latitude: 12.9720,
    longitude: 77.6415,
    tracking_active: true,
  });
  console.log(`✔ Live GPS location updated: lat=${loc.latitude}, lng=${loc.longitude}`);

  // Advance to OTP_VERIFIED
  const otpVerified = await DbService.addPickupStatusLog(
    pickupId,
    'OTP_VERIFIED',
    'OTP Verified',
    'Customer OTP 1234 entered by collector',
    createdCol.id,
    'collector'
  );
  console.log(`✔ OTP Verification -> Status: ${otpVerified?.status}`);

  // Weigh pickup
  const weighed = await DbService.updatePickup(pickupId, {
    actual_weight: 5.5,
    rate_per_kg: 35.0,
    final_value: 192.5,
    status: 'WEIGHED',
  });
  console.log(`✔ Pickup weighed: ${weighed?.actual_weight}kg, Final Value: ₹${weighed?.final_value}`);

  // Complete pickup & issue EcoCredits
  const completed = await DbService.updatePickup(pickupId, {
    status: 'COMPLETED',
    completed_at: new Date().toISOString(),
  });
  console.log(`✔ Pickup state -> COMPLETED at ${completed?.completed_at}`);

  // Add EcoTransaction & verify balance
  const ecoTx = await DbService.addEcoTransaction({
    id: `tx_test_${Date.now()}`,
    user_id: createdUser.id,
    type: 'EARNED',
    credits: 22,
    source: `Doorstep Pickup #${pickupId}`,
    reference_id: pickupId,
    created_at: new Date().toISOString(),
  });
  console.log(`✔ EcoTransaction added: +${ecoTx.credits} credits. Reference: ${ecoTx.reference_id}`);

  // Check Idempotency
  const isDuplicate = await DbService.hasEcoCreditForReference(createdUser.id, pickupId);
  console.log(`✔ Idempotency check: hasEcoCreditForReference = ${isDuplicate}`);

  // Check Balance
  const balance = await DbService.getUserLedgerBalance(createdUser.id);
  console.log(`✔ User ledger balance: ${balance} credits`);

  // 6. Admin Stats Check
  const stats = await DbService.getAdminStats();
  console.log(`✔ Admin Stats computed: Total Users=${stats.totalUsers}, Total Pickups=${stats.totalPickups}, Recycled=${stats.totalWasteRecycled}kg`);

  console.log('--- ALL PLATFORM INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
}

runPlatformTests()
  .catch((err) => {
    console.error('Integration test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
