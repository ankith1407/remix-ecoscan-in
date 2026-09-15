import { db } from '../server/db';
import { hashPassword, verifyPassword, generateTokens } from '../server/middleware/auth';

async function testRegistrationAndLogin() {
  console.log('Testing User Registration & Authentication flow...');

  const testEmail = `testuser_${Date.now()}@ecoscan.in`;
  const testPassword = 'myPassword123';

  // 1. Verify user does not exist
  const existing = db.getUserByEmail(testEmail);
  if (existing) {
    throw new Error('Test email already exists.');
  }

  // 2. Hash password & save user
  const hashedPassword = await hashPassword(testPassword);
  const newUser = {
    id: `usr_${Date.now()}`,
    name: 'Test Citizen User',
    email: testEmail,
    phone: '+91 99999 88888',
    profile_image: '',
    password_hash: hashedPassword,
    role: 'user' as const,
    address: 'Test Street, Bengaluru, KA',
    eco_credits: 50,
    total_waste_recycled: 0,
    total_earnings: 0,
    created_at: new Date().toISOString(),
  };

  db.saveUser(newUser);
  console.log('✔ User saved to database:', newUser.email);

  // 3. Generate tokens
  const tokens = generateTokens({ id: newUser.id, email: newUser.email, role: newUser.role });
  if (!tokens.accessToken || !tokens.refreshToken) {
    throw new Error('Failed to generate authentication tokens.');
  }
  console.log('✔ Tokens generated successfully.');

  // 4. Verify password authentication
  const retrievedUser = db.getUserByEmail(testEmail);
  if (!retrievedUser || !retrievedUser.password_hash) {
    throw new Error('Retrieved user is invalid.');
  }

  const isValid = await verifyPassword(testPassword, retrievedUser.password_hash);
  if (!isValid) {
    throw new Error('Password verification failed.');
  }
  console.log('✔ Password verification passed.');

  console.log('ALL AUTHENTICATION TESTS PASSED SUCCESSFULLY!');
}

testRegistrationAndLogin().catch((err) => {
  console.error('Auth test failed:', err);
  process.exit(1);
});
