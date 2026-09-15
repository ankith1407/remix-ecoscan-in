import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BACKUP_FILE = path.join(process.cwd(), 'data', 'ecoscan_database.json.bak');

async function seed() {
  console.log('[Seed] Reading database backup file:', BACKUP_FILE);
  if (!fs.existsSync(BACKUP_FILE)) {
    console.error('[Seed] Backup file data/ecoscan_database.json.bak not found!');
    process.exit(1);
  }

  const raw = fs.readFileSync(BACKUP_FILE, 'utf-8');
  const data = JSON.parse(raw);

  console.log('[Seed] Starting database migration & seeding...');

  // 1. Seed Users
  if (Array.isArray(data.users)) {
    for (const u of data.users) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: {
          name: u.name,
          phone: u.phone,
          role: u.role || 'user',
          ecoCredits: u.eco_credits || 0,
          totalWasteRecycled: u.total_waste_recycled || 0,
          totalEarnings: u.total_earnings || 0,
        },
        create: {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role || 'user',
          ecoCredits: u.eco_credits || 0,
          totalWasteRecycled: u.total_waste_recycled || 0,
          totalEarnings: u.total_earnings || 0,
          createdAt: u.created_at ? new Date(u.created_at) : new Date(),
        },
      });

      // Also seed default primary address for user
      if (u.address) {
        const existingAddr = await prisma.address.findFirst({ where: { userId: u.id } });
        if (!existingAddr) {
          await prisma.address.create({
            data: {
              userId: u.id,
              label: 'Default Address',
              fullAddress: u.address,
              latitude: u.latitude || 12.9716,
              longitude: u.longitude || 77.6412,
              isDefault: true,
            },
          });
        }
      }
    }
    console.log(`[Seed] Seeded ${data.users.length} users & addresses.`);
  }

  // 2. Seed Waste Materials
  if (Array.isArray(data.waste_materials)) {
    for (const m of data.waste_materials) {
      await prisma.wasteMaterial.upsert({
        where: { materialName: m.material_name },
        update: {
          category: m.category,
          currentPricePerKg: m.current_price_per_kg,
          unit: m.unit || '₹/kg',
          recyclable: m.recyclable !== undefined ? m.recyclable : true,
          disposalInstruction: m.disposal_instruction || '',
        },
        create: {
          id: m.id,
          materialName: m.material_name,
          category: m.category,
          currentPricePerKg: m.current_price_per_kg,
          unit: m.unit || '₹/kg',
          recyclable: m.recyclable !== undefined ? m.recyclable : true,
          disposalInstruction: m.disposal_instruction || '',
        },
      });
    }
    console.log(`[Seed] Seeded ${data.waste_materials.length} waste materials.`);
  }

  // 3. Seed Collectors
  if (Array.isArray(data.collectors)) {
    for (const c of data.collectors) {
      const user = await prisma.user.findFirst({ where: { id: c.user_id } });
      if (user) {
        await prisma.collector.upsert({
          where: { userId: user.id },
          update: {
            businessName: c.name,
            phone: c.phone,
            verificationStatus: c.verification_status || 'VERIFIED',
            serviceArea: c.service_area || 'Hyderabad Central',
            available: c.available !== undefined ? c.available : true,
            rating: c.rating || 5.0,
            totalPickups: c.total_pickups || 0,
            totalEarnings: c.total_earnings || 0,
          },
          create: {
            id: c.id,
            userId: user.id,
            businessName: c.name,
            phone: c.phone,
            verificationStatus: c.verification_status || 'VERIFIED',
            serviceArea: c.service_area || 'Hyderabad Central',
            latitude: c.latitude || 17.3850,
            longitude: c.longitude || 78.4867,
            available: c.available !== undefined ? c.available : true,
            rating: c.rating || 5.0,
            totalPickups: c.total_pickups || 0,
            totalEarnings: c.total_earnings || 0,
          },
        });
      }
    }
    console.log(`[Seed] Seeded ${data.collectors.length} collectors.`);
  }

  // 4. Seed Partners
  if (Array.isArray(data.partners)) {
    for (const p of data.partners) {
      await prisma.partner.upsert({
        where: { id: p.id },
        update: {
          partnerName: p.partner_name,
          category: p.category || 'local_partners',
          description: p.description || '',
          locationArea: p.location_area || 'Hyderabad',
          contactInfo: p.contact_info || '',
          partnershipStatus: p.partnership_status || 'Active',
          verifiedStatus: p.verified_status !== undefined ? p.verified_status : true,
          active: p.active !== undefined ? p.active : true,
          cityAvailability: p.city_availability || 'Hyderabad',
        },
        create: {
          id: p.id,
          partnerName: p.partner_name,
          category: p.category || 'local_partners',
          description: p.description || '',
          locationArea: p.location_area || 'Hyderabad',
          contactInfo: p.contact_info || '',
          partnershipStatus: p.partnership_status || 'Active',
          verifiedStatus: p.verified_status !== undefined ? p.verified_status : true,
          rewardTypes: (p.reward_types || ['Discount Coupon']).join(', '),
          startDate: p.start_date || '01/01/2026',
          expiryDate: p.expiry_date || '31/12/2026',
          termsAndConditions: p.terms_and_conditions || '',
          active: p.active !== undefined ? p.active : true,
          cityAvailability: p.city_availability || 'Hyderabad',
        },
      });
    }
    console.log(`[Seed] Seeded ${data.partners.length} partners.`);
  }

  console.log('[Seed] Database seeding completed successfully!');
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error('[Seed] Error seeding database:', err);
  prisma.$disconnect();
  process.exit(1);
});
