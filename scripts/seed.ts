import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const jsonPath = path.join(process.cwd(), 'data', 'ecoscan_database.json');
  if (!fs.existsSync(jsonPath)) {
    console.log('No json database found to migrate.');
    return;
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(rawData);

  console.log('Seeding Prisma database from JSON data...');

  // 1. Seed Users
  if (Array.isArray(data.users)) {
    const seenPhones = new Set<string>();

    // Pre-load existing phones from DB to avoid conflicts
    const existingUsers = await prisma.user.findMany({ select: { phone: true } });
    existingUsers.forEach((u) => seenPhones.add(u.phone));

    for (const u of data.users) {
      let rawPhone = (u.phone || '').trim() || `+91${u.id.slice(-10)}`;
      // Make phone unique within this batch
      let phoneCandidate = rawPhone;
      let suffix = 1;
      while (seenPhones.has(phoneCandidate)) {
        phoneCandidate = `${rawPhone}_${suffix++}`;
      }
      seenPhones.add(phoneCandidate);

      await prisma.user.upsert({
        where: { id: u.id },
        update: {
          name: u.name,
          email: u.email,
          phone: phoneCandidate,
          passwordHash: u.password_hash || null,
          role: u.role || 'user',
          ecoCredits: u.eco_credits || 0,
          totalWasteRecycled: u.total_waste_recycled || 0,
          totalEarnings: u.total_earnings || 0,
        },
        create: {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: phoneCandidate,
          passwordHash: u.password_hash || null,
          role: u.role || 'user',
          ecoCredits: u.eco_credits || 0,
          totalWasteRecycled: u.total_waste_recycled || 0,
          totalEarnings: u.total_earnings || 0,
          createdAt: u.created_at ? new Date(u.created_at) : new Date(),
        },
      });

      if (u.address) {
        await prisma.address.create({
          data: {
            userId: u.id,
            label: 'Primary Address',
            fullAddress: u.address,
            latitude: u.latitude || 12.9716,
            longitude: u.longitude || 77.6412,
            isDefault: true,
          },
        }).catch(() => {});
      }
    }
    console.log(`Seeded ${data.users.length} users.`);
  }


  // 2. Seed Collectors
  if (Array.isArray(data.collectors)) {
    for (const c of data.collectors) {
      let userExists = await prisma.user.findUnique({ where: { id: c.user_id } });
      if (!userExists) {
        userExists = await prisma.user.create({
          data: {
            id: c.user_id,
            name: c.name,
            email: `${c.id}@ecoscan.in`,
            phone: c.phone || `+91-${c.id.slice(-8)}`,
            role: 'collector',
          },
        });
      }

      await prisma.collector.upsert({
        where: { id: c.id },
        update: {
          businessName: c.name,
          phone: c.phone,
          verificationStatus: c.verification_status || 'VERIFIED',
          serviceArea: c.service_area || 'Hyderabad Central',
          latitude: c.latitude || 17.3850,
          longitude: c.longitude || 78.4867,
          available: c.available ?? true,
          rating: c.rating || 5.0,
          totalPickups: c.total_pickups || 0,
          totalEarnings: c.total_earnings || 0,
        },
        create: {
          id: c.id,
          userId: userExists.id,
          businessName: c.name,
          phone: c.phone,
          verificationStatus: c.verification_status || 'VERIFIED',
          serviceArea: c.service_area || 'Hyderabad Central',
          latitude: c.latitude || 17.3850,
          longitude: c.longitude || 78.4867,
          available: c.available ?? true,
          rating: c.rating || 5.0,
          totalPickups: c.total_pickups || 0,
          totalEarnings: c.total_earnings || 0,
        },
      });
    }
    console.log(`Seeded ${data.collectors.length} collectors.`);
  }

  // 3. Seed Waste Materials
  if (Array.isArray(data.waste_materials)) {
    for (const m of data.waste_materials) {
      await prisma.wasteMaterial.upsert({
        where: { id: m.id },
        update: {
          materialName: m.material_name,
          category: m.category,
          currentPricePerKg: m.current_price_per_kg,
          unit: m.unit || '₹/kg',
          recyclable: m.recyclable ?? true,
          disposalInstruction: m.disposal_instruction || '',
        },
        create: {
          id: m.id,
          materialName: m.material_name,
          category: m.category,
          currentPricePerKg: m.current_price_per_kg,
          unit: m.unit || '₹/kg',
          recyclable: m.recyclable ?? true,
          disposalInstruction: m.disposal_instruction || '',
          lastUpdated: m.last_updated ? new Date(m.last_updated) : new Date(),
        },
      });
    }
    console.log(`Seeded ${data.waste_materials.length} waste materials.`);
  }

  // 4. Seed Partners
  if (Array.isArray(data.partners)) {
    for (const p of data.partners) {
      await prisma.partner.upsert({
        where: { id: p.id },
        update: {
          partnerName: p.partner_name,
          category: p.category,
          description: p.description,
          locationArea: p.location_area,
          contactInfo: p.contact_info,
          partnershipStatus: p.partnership_status || 'Active',
          verifiedStatus: p.verified_status ?? true,
          rewardTypes: Array.isArray(p.reward_types) ? p.reward_types.join(', ') : p.reward_types || 'Discount Coupon',
          startDate: p.start_date || '01/01/2026',
          expiryDate: p.expiry_date || '31/12/2026',
          termsAndConditions: p.terms_and_conditions || '',
          active: p.active ?? true,
          cityAvailability: p.city_availability || 'Hyderabad',
        },
        create: {
          id: p.id,
          partnerName: p.partner_name,
          category: p.category,
          description: p.description,
          locationArea: p.location_area,
          contactInfo: p.contact_info,
          partnershipStatus: p.partnership_status || 'Active',
          verifiedStatus: p.verified_status ?? true,
          rewardTypes: Array.isArray(p.reward_types) ? p.reward_types.join(', ') : p.reward_types || 'Discount Coupon',
          startDate: p.start_date || '01/01/2026',
          expiryDate: p.expiry_date || '31/12/2026',
          termsAndConditions: p.terms_and_conditions || '',
          active: p.active ?? true,
          cityAvailability: p.city_availability || 'Hyderabad',
        },
      });
    }
    console.log(`Seeded ${data.partners.length} partners.`);
  }

  // 5. Seed Reward Items
  if (Array.isArray(data.rewards)) {
    for (const r of data.rewards) {
      const discountVal = r.discount_value || r.reward_value || 'Voucher';
      await prisma.rewardItem.upsert({
        where: { id: r.id },
        update: {
          partnerId: r.partner_id || 'part-1',
          partnerName: r.partner_name || 'EcoScan Partner',
          title: r.title || r.reward_title || 'Reward Voucher',
          description: r.description || r.reward_description || '',
          rewardCategory: r.reward_category || 'eco',
          creditsRequired: r.credits_required || 100,
          discountValue: discountVal,
          rewardType: r.voucher_type || 'discount',
          terms: r.terms || '',
          expiryDate: r.expiry_date || '31/12/2026',
          redemptionLimit: r.redemption_limit || 5,
          stock: r.stock || 50,
          active: r.active ?? true,
          sponsoredType: r.sponsored_type || 'partner',
          cityScope: r.city_scope || 'Hyderabad',
        },
        create: {
          id: r.id,
          partnerId: r.partner_id || 'part-1',
          partnerName: r.partner_name || 'EcoScan Partner',
          title: r.title || r.reward_title || 'Reward Voucher',
          description: r.description || r.reward_description || '',
          rewardCategory: r.reward_category || 'eco',
          creditsRequired: r.credits_required || 100,
          discountValue: discountVal,
          rewardType: r.voucher_type || 'discount',
          terms: r.terms || '',
          expiryDate: r.expiry_date || '31/12/2026',
          redemptionLimit: r.redemption_limit || 5,
          stock: r.stock || 50,
          active: r.active ?? true,
          sponsoredType: r.sponsored_type || 'partner',
          cityScope: r.city_scope || 'Hyderabad',
        },
      });
    }
    console.log(`Seeded ${data.rewards.length} reward items.`);
  }

  // 6. Seed Pickups
  if (Array.isArray(data.pickup_requests)) {
    for (const p of data.pickup_requests) {
      const userExists = await prisma.user.findUnique({ where: { id: p.user_id } });
      if (!userExists) continue;

      const collectorExists = p.collector_id ? await prisma.collector.findUnique({ where: { id: p.collector_id } }) : null;

      await prisma.pickupRequest.upsert({
        where: { id: p.id },
        update: {
          wasteCategory: p.waste_category,
          itemsSummary: p.items_summary || null,
          estimatedWeight: p.estimated_weight,
          estimatedValue: p.estimated_value,
          actualWeight: p.actual_weight || null,
          finalValue: p.final_value || null,
          pickupAddress: p.pickup_address,
          specialInstructions: p.special_instructions || null,
          latitude: p.latitude || 12.9716,
          longitude: p.longitude || 77.6412,
          preferredDate: p.preferred_date || 'Today',
          preferredTime: p.preferred_time || '10:30 AM',
          status: p.status,
          otp: p.otp,
        },
        create: {
          id: p.id,
          userId: p.user_id,
          collectorId: collectorExists ? p.collector_id : null,
          wasteCategory: p.waste_category,
          itemsSummary: p.items_summary || null,
          estimatedWeight: p.estimated_weight,
          estimatedValue: p.estimated_value,
          actualWeight: p.actual_weight || null,
          finalValue: p.final_value || null,
          pickupAddress: p.pickup_address,
          specialInstructions: p.special_instructions || null,
          latitude: p.latitude || 12.9716,
          longitude: p.longitude || 77.6412,
          preferredDate: p.preferred_date || 'Today',
          preferredTime: p.preferred_time || '10:30 AM',
          status: p.status,
          otp: p.otp,
          createdAt: p.created_at ? new Date(p.created_at) : new Date(),
          completedAt: p.completed_at ? new Date(p.completed_at) : null,
        },
      });
    }
    console.log(`Seeded ${data.pickup_requests.length} pickups.`);
  }

  console.log('Database migration & seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Migration seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
