import { PrismaClient } from '@prisma/client';
import {
  DbUser,
  DbCollector,
  DbWasteMaterial,
  DbPickupRequest,
  DbPickupLocation,
  DbPayment,
  DbEcoTransaction,
  DbPartner,
  DbRewardItem,
  DbRewardRedemption,
  DbNotification,
  DbUserActivity,
  DbWasteScan,
  DbPickupRating,
  DbPointRule,
  DbUserAchievement,
  PickupStatus,
  RecipientRole,
  PartnerDashboardData,
  AdminStatsData,
} from '../db';

export const prisma = new PrismaClient();

export class DbService {
  // ── Seed logic ─────────────────────────────────────────────────────────────
  static async seedDefaultDataIfEmpty(): Promise<void> {
    try {
      const matCount = await prisma.wasteMaterial.count();
      if (matCount === 0) {
        const initialMaterials = [
          {
            id: 'mat-1',
            materialName: 'PET Plastic Bottles',
            category: 'Plastic',
            currentPricePerKg: 35,
            unit: '₹/kg',
            recyclable: true,
            disposalInstruction: 'Rinse with clean water, crush flat to reduce volume, place in blue dry bin.',
          },
          {
            id: 'mat-2',
            materialName: 'HDPE Plastic Containers',
            category: 'Plastic',
            currentPricePerKg: 28,
            unit: '₹/kg',
            recyclable: true,
            disposalInstruction: 'Clean milk jugs, detergent containers, rinse and dry before pickup.',
          },
          {
            id: 'mat-3',
            materialName: 'Corrugated Cardboard Boxes',
            category: 'Cardboard',
            currentPricePerKg: 14,
            unit: '₹/kg',
            recyclable: true,
            disposalInstruction: 'Flatten shipping boxes, protect strictly from moisture and oils.',
          },
          {
            id: 'mat-4',
            materialName: 'Old Newspapers (Raddi)',
            category: 'Paper',
            currentPricePerKg: 18,
            unit: '₹/kg',
            recyclable: true,
            disposalInstruction: 'Tie firmly in dry bundles with string. Keep dry.',
          },
          {
            id: 'mat-5',
            materialName: 'Heavy Iron & Steel Scrap',
            category: 'Metal',
            currentPricePerKg: 30,
            unit: '₹/kg',
            recyclable: true,
            disposalInstruction: 'Separate ferrous metals using magnet check. Remove plastic handles.',
          },
          {
            id: 'mat-6',
            materialName: 'Millberry Copper Wire',
            category: 'Metal',
            currentPricePerKg: 520,
            unit: '₹/kg',
            recyclable: true,
            disposalInstruction: 'Strip rubber insulation for maximum valuation rate at scrap mandi.',
          },
          {
            id: 'mat-7',
            materialName: 'E-Waste & Computer PCB Scrap',
            category: 'E-waste',
            currentPricePerKg: 120,
            unit: '₹/kg',
            recyclable: true,
            disposalInstruction: 'Do not dismantle battery cells. Place in designated e-waste drop bin.',
          },
          {
            id: 'mat-8',
            materialName: 'Glass Bottles & Jars',
            category: 'Glass',
            currentPricePerKg: 4,
            unit: '₹/kg',
            recyclable: true,
            disposalInstruction: 'Separate clear glass from amber/green glass. Prevent breakage.',
          },
        ];
        for (const m of initialMaterials) {
          await prisma.wasteMaterial.upsert({
            where: { id: m.id },
            update: {},
            create: m,
          });
        }
      }

      // Seed default admin and collector if empty
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        // Admin
        await prisma.user.create({
          data: {
            id: 'usr_admin_default',
            name: 'EcoScan Admin Desk',
            email: 'admin@ecoscan.in',
            phone: '+91 90000 00000',
            passwordHash: '$2b$10$e7W5l7ZgE4D/N6nI7U2d9uQ6X4q4n9z4v5u6w7x8y9z0a1b2c3d4e',
            role: 'admin',
            ecoCredits: 1000,
          },
        });

        // Collector
        const colUser = await prisma.user.create({
          data: {
            id: 'usr_collector_raju',
            name: 'Raju Kumar',
            email: 'raju@ecoscan.in',
            phone: '+91 98765 43210',
            passwordHash: '$2b$10$e7W5l7ZgE4D/N6nI7U2d9uQ6X4q4n9z4v5u6w7x8y9z0a1b2c3d4e',
            role: 'collector',
          },
        });

        await prisma.collector.create({
          data: {
            id: 'col-1',
            userId: colUser.id,
            businessName: 'Raju Kumar (Green Earth Kabadiwala Hub)',
            phone: '+91 98765 43210',
            verificationStatus: 'VERIFIED',
            serviceArea: 'Jubilee Hills, Banjara Hills, Film Nagar, Madhapur',
            latitude: 17.4156,
            longitude: 78.4347,
            available: true,
            rating: 4.9,
            totalPickups: 142,
            totalEarnings: 48950,
          },
        });
      }

      // Seed default PointRules if empty
      const pointRuleCount = await prisma.pointRule.count();
      if (pointRuleCount === 0) {
        const defaultRules = [
          { category: 'Dry Recyclables', pointsPerKg: 10, minWeightKg: 0.5 },
          { category: 'Plastic', pointsPerKg: 10, minWeightKg: 0.5 },
          { category: 'Paper', pointsPerKg: 5, minWeightKg: 0.5 },
          { category: 'Cardboard', pointsPerKg: 5, minWeightKg: 0.5 },
          { category: 'Metal', pointsPerKg: 15, minWeightKg: 0.5 },
          { category: 'E-waste', pointsPerKg: 25, minWeightKg: 0.1 },
          { category: 'Glass', pointsPerKg: 3, minWeightKg: 1.0 },
          { category: 'Organic', pointsPerKg: 2, minWeightKg: 1.0 },
        ];
        for (const rule of defaultRules) {
          await prisma.pointRule.upsert({
            where: { category: rule.category },
            update: {},
            create: rule,
          });
        }
      }

      // Seed default Partners and RewardItems if empty
      const rewardCount = await prisma.rewardItem.count();
      if (rewardCount === 0) {
        let partner = await prisma.partner.findFirst();
        if (!partner) {
          partner = await prisma.partner.create({
            data: {
              id: 'part-green-store',
              partnerName: 'GreenMart Organics & Eco Store',
              category: 'shopping',
              description: 'Sustainable grocery & eco-friendly daily essentials store.',
              locationArea: 'Banjara Hills, Hyderabad',
              contactInfo: 'support@greenmart.in',
              rewardTypes: 'Discount Coupon',
              startDate: '2026-01-01',
              expiryDate: '2027-12-31',
              termsAndConditions: 'Valid on purchases above ₹500. Cannot be combined with other offers.',
              active: true,
              cityAvailability: 'Hyderabad',
            },
          });
        }

        const defaultRewards = [
          {
            id: 'rw-1',
            partnerId: partner.id,
            partnerName: 'GreenMart Organics',
            title: '₹100 Off Organic Groceries',
            description: 'Get ₹100 instant discount on eco-certified sustainable groceries and organic pulses.',
            rewardCategory: 'Grocery',
            creditsRequired: 50,
            discountValue: '₹100 Off',
            rewardType: 'Discount Coupon',
            terms: 'Valid on order value above ₹499 at GreenMart store or app.',
            expiryDate: '2026-12-31',
            stock: 100,
            active: true,
            codeTemplate: 'GREEN-XXXXXX',
          },
          {
            id: 'rw-2',
            partnerId: partner.id,
            partnerName: 'EcoCafé Hyderabad',
            title: 'Free Artisan Organic Coffee / Tea',
            description: 'Redeem 1 free cup of organic fair-trade coffee or green tea at any EcoCafé outlet.',
            rewardCategory: 'Food & Beverage',
            creditsRequired: 30,
            discountValue: 'Free Drink',
            rewardType: 'Voucher',
            terms: 'Show voucher code at billing counter before ordering.',
            expiryDate: '2026-12-31',
            stock: 75,
            active: true,
            codeTemplate: 'CAFE-XXXXXX',
          },
          {
            id: 'rw-3',
            partnerId: partner.id,
            partnerName: 'BambooLife India',
            title: '20% Off Bamboo Toothbrush & Utensils Set',
            description: 'Zero-waste eco living hamper containing bamboo toothbrush, steel straw, and cotton tote bag.',
            rewardCategory: 'Eco Products',
            creditsRequired: 80,
            discountValue: '20% Off',
            rewardType: 'Discount Coupon',
            terms: 'Use code during online checkout at BambooLife.in.',
            expiryDate: '2026-12-31',
            stock: 50,
            active: true,
            codeTemplate: 'BAMBOO-XXXXXX',
          },
          {
            id: 'rw-4',
            partnerId: partner.id,
            partnerName: 'Metro Green Pass',
            title: '₹50 Transit Fare Recharge Top-Up',
            description: 'Support green public transport! ₹50 smart card top-up for Hyderabad Metro Rail.',
            rewardCategory: 'Travel & Mobility',
            creditsRequired: 100,
            discountValue: '₹50 Fare Credit',
            rewardType: 'Digital Voucher',
            terms: 'Recharge using metro smart card serial number in app.',
            expiryDate: '2026-12-31',
            stock: 40,
            active: true,
            codeTemplate: 'METRO-XXXXXX',
          },
        ];

        for (const rw of defaultRewards) {
          await prisma.rewardItem.upsert({
            where: { id: rw.id },
            update: {},
            create: rw,
          });
        }
      }
    } catch (err: any) {
      console.warn('[DbService] Error seeding default data:', err?.message);
    }
  }

  // ── Users ──────────────────────────────────────────────────────────────────
  static async getUsers(): Promise<DbUser[]> {
    const users = await prisma.user.findMany({ include: { addresses: true } });
    return users.map((u) => {
      const defaultAddr = u.addresses.find((a) => a.isDefault) || u.addresses[0];
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        profile_image: u.profileImage || '',
        role: u.role as any,
        address: defaultAddr ? defaultAddr.fullAddress : '',
        latitude: defaultAddr ? defaultAddr.latitude : undefined,
        longitude: defaultAddr ? defaultAddr.longitude : undefined,
        eco_credits: u.ecoCredits,
        total_waste_recycled: u.totalWasteRecycled,
        total_earnings: u.totalEarnings,
        created_at: u.createdAt.toISOString(),
        password_hash: u.passwordHash || undefined,
      };
    });
  }

  static async getUserById(id: string): Promise<DbUser | null> {
    const u = await prisma.user.findUnique({
      where: { id },
      include: { addresses: true },
    });
    if (!u) return null;
    const defaultAddr = u.addresses.find((a) => a.isDefault) || u.addresses[0];
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      profile_image: u.profileImage || '',
      role: u.role as any,
      address: defaultAddr ? defaultAddr.fullAddress : '',
      latitude: defaultAddr ? defaultAddr.latitude : undefined,
      longitude: defaultAddr ? defaultAddr.longitude : undefined,
      eco_credits: u.ecoCredits,
      total_waste_recycled: u.totalWasteRecycled,
      total_earnings: u.totalEarnings,
      created_at: u.createdAt.toISOString(),
      password_hash: u.passwordHash || undefined,
    };
  }

  static async getUserByEmail(email: string): Promise<DbUser | null> {
    if (!email) return null;
    const u = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { addresses: true },
    });
    if (!u) return null;
    const defaultAddr = u.addresses.find((a) => a.isDefault) || u.addresses[0];
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      profile_image: u.profileImage || '',
      role: u.role as any,
      address: defaultAddr ? defaultAddr.fullAddress : '',
      latitude: defaultAddr ? defaultAddr.latitude : undefined,
      longitude: defaultAddr ? defaultAddr.longitude : undefined,
      eco_credits: u.ecoCredits,
      total_waste_recycled: u.totalWasteRecycled,
      total_earnings: u.totalEarnings,
      created_at: u.createdAt.toISOString(),
      password_hash: u.passwordHash || undefined,
    };
  }

  static async getUserByPhone(phone: string): Promise<DbUser | null> {
    if (!phone) return null;
    const u = await prisma.user.findUnique({
      where: { phone: phone.trim() },
      include: { addresses: true },
    });
    if (!u) return null;
    const defaultAddr = u.addresses.find((a) => a.isDefault) || u.addresses[0];
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      profile_image: u.profileImage || '',
      role: u.role as any,
      address: defaultAddr ? defaultAddr.fullAddress : '',
      latitude: defaultAddr ? defaultAddr.latitude : undefined,
      longitude: defaultAddr ? defaultAddr.longitude : undefined,
      eco_credits: u.ecoCredits,
      total_waste_recycled: u.totalWasteRecycled,
      total_earnings: u.totalEarnings,
      created_at: u.createdAt.toISOString(),
      password_hash: u.passwordHash || undefined,
    };
  }

  static async saveUser(user: Partial<DbUser> & { id: string }): Promise<DbUser> {
    const updated = await prisma.user.upsert({
      where: { id: user.id },
      update: {
        ...(user.name && { name: user.name }),
        ...(user.email && { email: user.email.toLowerCase() }),
        ...(user.phone && { phone: user.phone }),
        ...(user.password_hash !== undefined && { passwordHash: user.password_hash }),
        ...(user.profile_image !== undefined && { profileImage: user.profile_image }),
        ...(user.role && { role: user.role }),
        ...(user.eco_credits !== undefined && { ecoCredits: user.eco_credits }),
        ...(user.total_waste_recycled !== undefined && { totalWasteRecycled: user.total_waste_recycled }),
        ...(user.total_earnings !== undefined && { totalEarnings: user.total_earnings }),
      },
      create: {
        id: user.id,
        name: user.name || 'User',
        email: (user.email || '').toLowerCase(),
        phone: user.phone || user.id,
        passwordHash: user.password_hash || null,
        role: user.role || 'user',
        ecoCredits: user.eco_credits ?? 50,
        totalWasteRecycled: user.total_waste_recycled ?? 0,
        totalEarnings: user.total_earnings ?? 0,
      },
    });

    if (user.address) {
      const existingAddr = await prisma.address.findFirst({ where: { userId: user.id, isDefault: true } });
      if (existingAddr) {
        await prisma.address.update({
          where: { id: existingAddr.id },
          data: {
            fullAddress: user.address,
            ...(user.latitude !== undefined && { latitude: user.latitude }),
            ...(user.longitude !== undefined && { longitude: user.longitude }),
          },
        });
      } else {
        await prisma.address.create({
          data: {
            userId: user.id,
            label: 'Home',
            fullAddress: user.address,
            latitude: user.latitude ?? 17.3850,
            longitude: user.longitude ?? 78.4867,
            isDefault: true,
          },
        });
      }
    }

    return (await this.getUserById(updated.id))!;
  }

  // ── Collectors ─────────────────────────────────────────────────────────────
  static async getCollectors(): Promise<DbCollector[]> {
    const collectors = await prisma.collector.findMany({
      include: { user: true },
    });
    return collectors.map((c) => ({
      id: c.id,
      user_id: c.userId,
      name: c.businessName || c.user.name,
      phone: c.phone || c.user.phone,
      verification_status: c.verificationStatus as any,
      service_area: c.serviceArea,
      latitude: c.latitude,
      longitude: c.longitude,
      available: c.available,
      rating: c.rating,
      total_pickups: c.totalPickups,
      total_earnings: c.totalEarnings,
    }));
  }

  static async getCollectorById(id: string): Promise<DbCollector | null> {
    const c = await prisma.collector.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!c) return null;
    return {
      id: c.id,
      user_id: c.userId,
      name: c.businessName || c.user.name,
      phone: c.phone || c.user.phone,
      verification_status: c.verificationStatus as any,
      service_area: c.serviceArea,
      latitude: c.latitude,
      longitude: c.longitude,
      available: c.available,
      rating: c.rating,
      total_pickups: c.totalPickups,
      total_earnings: c.totalEarnings,
    };
  }

  static async getCollectorByUserId(userId: string): Promise<DbCollector | null> {
    const c = await prisma.collector.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!c) return null;
    return {
      id: c.id,
      user_id: c.userId,
      name: c.businessName || c.user.name,
      phone: c.phone || c.user.phone,
      verification_status: c.verificationStatus as any,
      service_area: c.serviceArea,
      latitude: c.latitude,
      longitude: c.longitude,
      available: c.available,
      rating: c.rating,
      total_pickups: c.totalPickups,
      total_earnings: c.totalEarnings,
    };
  }

  static async saveCollector(collector: Partial<DbCollector> & { id: string; user_id: string }): Promise<DbCollector> {
    let user = await prisma.user.findUnique({ where: { id: collector.user_id } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: collector.user_id,
          name: collector.name || 'Kabadiwala Partner',
          email: `${collector.user_id}@ecoscan.in`,
          phone: collector.phone || '+91 90000 00000',
          passwordHash: '$2b$10$e7W5l7ZgE4D/N6nI7U2d9uQ6X4q4n9z4v5u6w7x8y9z0a1b2c3d4e',
          role: 'collector',
        },
      });
    }

    const businessName = collector.name || user?.name || 'Kabadiwala Partner';
    const phone = collector.phone || user?.phone || '';

    const upserted = await prisma.collector.upsert({
      where: { id: collector.id },
      update: {
        ...(collector.name && { businessName: collector.name }),
        ...(collector.phone && { phone: collector.phone }),
        ...(collector.verification_status && { verificationStatus: collector.verification_status }),
        ...(collector.service_area && { serviceArea: collector.service_area }),
        ...(collector.latitude !== undefined && { latitude: collector.latitude }),
        ...(collector.longitude !== undefined && { longitude: collector.longitude }),
        ...(collector.available !== undefined && { available: collector.available }),
        ...(collector.rating !== undefined && { rating: collector.rating }),
        ...(collector.total_pickups !== undefined && { totalPickups: collector.total_pickups }),
        ...(collector.total_earnings !== undefined && { totalEarnings: collector.total_earnings }),
      },
      create: {
        id: collector.id,
        userId: collector.user_id,
        businessName,
        phone,
        verificationStatus: collector.verification_status || 'PENDING',
        serviceArea: collector.service_area || 'Hyderabad Central',
        latitude: collector.latitude ?? 17.3850,
        longitude: collector.longitude ?? 78.4867,
        available: collector.available ?? false,
        rating: collector.rating ?? 5.0,
        totalPickups: collector.total_pickups ?? 0,
        totalEarnings: collector.total_earnings ?? 0,
      },
      include: { user: true },
    });

    return (await this.getCollectorById(upserted.id))!;
  }

  // ── Waste Materials ────────────────────────────────────────────────────────
  static async getMaterials(): Promise<DbWasteMaterial[]> {
    const materials = await prisma.wasteMaterial.findMany();
    return materials.map((m) => ({
      id: m.id,
      material_name: m.materialName,
      category: m.category as any,
      current_price_per_kg: m.currentPricePerKg,
      unit: m.unit,
      recyclable: m.recyclable,
      disposal_instruction: m.disposalInstruction,
      last_updated: m.lastUpdated.toISOString(),
    }));
  }

  static async addMaterial(material: DbWasteMaterial): Promise<DbWasteMaterial> {
    const created = await prisma.wasteMaterial.create({
      data: {
        id: material.id,
        materialName: material.material_name,
        category: material.category,
        currentPricePerKg: material.current_price_per_kg,
        unit: material.unit || '₹/kg',
        recyclable: material.recyclable,
        disposalInstruction: material.disposal_instruction,
      },
    });

    return {
      id: created.id,
      material_name: created.materialName,
      category: created.category as any,
      current_price_per_kg: created.currentPricePerKg,
      unit: created.unit,
      recyclable: created.recyclable,
      disposal_instruction: created.disposalInstruction,
      last_updated: created.lastUpdated.toISOString(),
    };
  }

  static async updateMaterial(id: string, updates: Partial<DbWasteMaterial>): Promise<DbWasteMaterial | null> {
    const existing = await prisma.wasteMaterial.findUnique({ where: { id } });
    if (!existing) return null;

    const updated = await prisma.wasteMaterial.update({
      where: { id },
      data: {
        ...(updates.material_name && { materialName: updates.material_name }),
        ...(updates.category && { category: updates.category }),
        ...(updates.current_price_per_kg !== undefined && { currentPricePerKg: updates.current_price_per_kg }),
        ...(updates.unit && { unit: updates.unit }),
        ...(updates.recyclable !== undefined && { recyclable: updates.recyclable }),
        ...(updates.disposal_instruction && { disposalInstruction: updates.disposal_instruction }),
        lastUpdated: new Date(),
      },
    });

    return {
      id: updated.id,
      material_name: updated.materialName,
      category: updated.category as any,
      current_price_per_kg: updated.currentPricePerKg,
      unit: updated.unit,
      recyclable: updated.recyclable,
      disposal_instruction: updated.disposalInstruction,
      last_updated: updated.lastUpdated.toISOString(),
    };
  }

  // ── Pickups ────────────────────────────────────────────────────────────────
  static async getPickups(filter?: { userId?: string; collectorId?: string; status?: PickupStatus }): Promise<DbPickupRequest[]> {
    const where: any = {};
    if (filter?.userId) where.userId = filter.userId;
    if (filter?.collectorId) where.collectorId = filter.collectorId;
    if (filter?.status) where.status = filter.status;

    const pickups = await prisma.pickupRequest.findMany({
      where,
      include: {
        user: true,
        collector: { include: { user: true } },
        statusLogs: { orderBy: { timestamp: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return pickups.map((p) => ({
      id: p.id,
      user_id: p.userId,
      user_name: p.user.name,
      user_phone: p.user.phone,
      collector_id: p.collectorId || undefined,
      collector_name: p.collector ? p.collector.businessName : undefined,
      collector_rating: p.collector ? p.collector.rating : undefined,
      collector_phone: p.collector ? p.collector.phone : undefined,
      waste_category: p.wasteCategory,
      items_summary: p.itemsSummary || undefined,
      estimated_weight: p.estimatedWeight,
      estimated_value: p.estimatedValue,
      actual_weight: p.actualWeight || undefined,
      rate_per_kg: p.ratePerKg || undefined,
      final_value: p.finalValue || undefined,
      pickup_address: p.pickupAddress,
      special_instructions: p.specialInstructions || undefined,
      latitude: p.latitude,
      longitude: p.longitude,
      preferred_date: p.preferredDate,
      preferred_time: p.preferredTime,
      status: p.status as PickupStatus,
      status_history: p.statusLogs.map((l) => ({
        id: l.id,
        pickup_id: l.pickupId,
        old_status: (l.oldStatus as PickupStatus) || undefined,
        new_status: l.newStatus as PickupStatus,
        status: l.newStatus as PickupStatus,
        title: l.title,
        changed_by: l.changedBy || undefined,
        changed_by_role: (l.changedByRole as RecipientRole) || undefined,
        timestamp: l.timestamp.toISOString(),
        note: l.note || undefined,
      })),
      otp: p.otp,
      otp_attempts: p.otpAttempts,
      otp_verified_at: p.otpVerifiedAt ? p.otpVerifiedAt.toISOString() : undefined,
      cancelled_by: p.cancelledBy || undefined,
      cancelled_reason: p.cancelledReason || undefined,
      cancelled_at: p.cancelledAt ? p.cancelledAt.toISOString() : undefined,
      rating: p.rating || undefined,
      review: p.review || undefined,
      rating_created_at: p.ratingCreatedAt ? p.ratingCreatedAt.toISOString() : undefined,
      created_at: p.createdAt.toISOString(),
      completed_at: p.completedAt ? p.completedAt.toISOString() : undefined,
    }));
  }

  static async getPickupById(id: string): Promise<DbPickupRequest | null> {
    const list = await this.getPickups();
    return list.find((p) => p.id === id) || null;
  }

  static async savePickup(data: DbPickupRequest): Promise<DbPickupRequest> {
    // Ensure User exists in Prisma
    let user = await prisma.user.findUnique({ where: { id: data.user_id } });
    if (!user) {
      await prisma.user.create({
        data: {
          id: data.user_id,
          name: data.user_name || 'User',
          email: `${data.user_id}@ecoscan.in`,
          phone: data.user_phone || '+91 90000 00000',
        },
      }).catch(() => {});
    }

    const upserted = await prisma.pickupRequest.upsert({
      where: { id: data.id },
      update: {
        collectorId: data.collector_id || null,
        status: data.status,
        actualWeight: data.actual_weight !== undefined ? data.actual_weight : null,
        ratePerKg: data.rate_per_kg !== undefined ? data.rate_per_kg : null,
        finalValue: data.final_value !== undefined ? data.final_value : null,
        otp: data.otp,
        otpAttempts: data.otp_attempts ?? 0,
        otpVerifiedAt: data.otp_verified_at ? new Date(data.otp_verified_at) : null,
        cancelledBy: data.cancelled_by || null,
        cancelledReason: data.cancelled_reason || null,
        cancelledAt: data.cancelled_at ? new Date(data.cancelled_at) : null,
        rating: data.rating !== undefined ? data.rating : null,
        review: data.review || null,
        ratingCreatedAt: data.rating_created_at ? new Date(data.rating_created_at) : null,
        completedAt: data.completed_at ? new Date(data.completed_at) : null,
      },
      create: {
        id: data.id,
        userId: data.user_id,
        collectorId: data.collector_id || null,
        wasteCategory: data.waste_category,
        itemsSummary: data.items_summary || null,
        estimatedWeight: data.estimated_weight,
        estimatedValue: data.estimated_value,
        pickupAddress: data.pickup_address,
        specialInstructions: data.special_instructions || null,
        latitude: data.latitude,
        longitude: data.longitude,
        preferredDate: data.preferred_date,
        preferredTime: data.preferred_time,
        status: data.status,
        otp: data.otp,
      },
    });

    if (data.status_history && data.status_history.length > 0) {
      for (const log of data.status_history) {
        if (log.id) {
          await prisma.pickupStatusLog.upsert({
            where: { id: log.id },
            update: {},
            create: {
              id: log.id,
              pickupId: upserted.id,
              oldStatus: log.old_status || null,
              newStatus: log.new_status || log.status,
              title: log.title,
              changedBy: log.changed_by || null,
              changedByRole: log.changed_by_role || null,
              note: log.note || null,
            },
          }).catch(() => {});
        }
      }
    }

    return (await this.getPickupById(upserted.id))!;
  }

  static async createPickup(data: DbPickupRequest): Promise<DbPickupRequest> {
    return this.savePickup(data);
  }

  static async updatePickup(id: string, updates: Partial<DbPickupRequest>): Promise<DbPickupRequest | null> {
    const existing = await this.getPickupById(id);
    if (!existing) return null;

    const merged: DbPickupRequest = {
      ...existing,
      ...updates,
    };

    if (updates.status && updates.status !== existing.status) {
      const logEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        pickup_id: id,
        old_status: existing.status,
        new_status: updates.status,
        status: updates.status,
        title: `Status updated to ${updates.status}`,
        changed_by: updates.collector_id || updates.user_id || 'system',
        changed_by_role: 'system' as RecipientRole,
        timestamp: new Date().toISOString(),
      };
      merged.status_history = merged.status_history ? [...merged.status_history, logEntry] : [logEntry];
    }

    return this.savePickup(merged);
  }

  static async addPickupStatusLog(
    pickupId: string,
    status: PickupStatus,
    title: string,
    note?: string,
    changedBy?: string,
    changedByRole?: RecipientRole | 'system'
  ): Promise<DbPickupRequest | null> {
    const pickup = await prisma.pickupRequest.findUnique({ where: { id: pickupId } });
    if (!pickup) return null;

    const oldStatus = pickup.status;
    await prisma.pickupRequest.update({
      where: { id: pickupId },
      data: { status },
    });

    await prisma.pickupStatusLog.create({
      data: {
        pickupId,
        oldStatus,
        newStatus: status,
        title,
        note: note || null,
        changedBy: changedBy || null,
        changedByRole: changedByRole || null,
      },
    });

    return await this.getPickupById(pickupId);
  }

  static async updatePickupLocation(loc: DbPickupLocation): Promise<DbPickupLocation> {
    const updated = await prisma.pickupLocation.upsert({
      where: { pickupId: loc.pickup_id },
      update: {
        collectorId: loc.collector_id,
        latitude: loc.latitude,
        longitude: loc.longitude,
        trackingActive: loc.tracking_active,
        updatedAt: new Date(),
      },
      create: {
        pickupId: loc.pickup_id,
        collectorId: loc.collector_id,
        latitude: loc.latitude,
        longitude: loc.longitude,
        trackingActive: loc.tracking_active,
      },
    });

    return {
      pickup_id: updated.pickupId,
      collector_id: updated.collectorId,
      latitude: updated.latitude,
      longitude: updated.longitude,
      tracking_active: updated.trackingActive,
      updated_at: updated.updatedAt.toISOString(),
    };
  }

  // ── Scans ──────────────────────────────────────────────────────────────────
  static async addScan(scan: DbWasteScan): Promise<DbWasteScan> {
    const created = await prisma.wasteScan.create({
      data: {
        id: scan.id,
        userId: scan.user_id,
        detectedMaterial: scan.detected_material,
        wasteCategory: scan.waste_category,
        confidence: scan.confidence,
        estimatedWeight: scan.estimated_weight,
        estimatedValue: scan.estimated_value,
        disposalInstruction: scan.disposal_instruction,
      },
    });

    return {
      id: created.id,
      user_id: created.userId,
      detected_material: created.detectedMaterial,
      waste_category: created.wasteCategory,
      confidence: created.confidence,
      estimated_weight: created.estimatedWeight,
      estimated_value: created.estimatedValue,
      disposal_instruction: created.disposalInstruction,
      created_at: created.createdAt.toISOString(),
    };
  }

  // ── Payments ───────────────────────────────────────────────────────────────
  static async addPayment(pay: DbPayment): Promise<DbPayment> {
    const created = await prisma.payment.create({
      data: {
        id: pay.id,
        pickupId: pay.pickup_id,
        userId: pay.user_id,
        collectorId: pay.collector_id,
        amount: pay.amount,
        paymentMethod: pay.payment_method,
        paymentStatus: pay.payment_status,
        transactionRef: pay.transaction_reference,
      },
    });

    return {
      id: created.id,
      pickup_id: created.pickupId,
      user_id: created.userId,
      collector_id: created.collectorId,
      amount: created.amount,
      payment_method: created.paymentMethod as any,
      payment_status: created.paymentStatus as any,
      transaction_reference: created.transactionRef,
      created_at: created.createdAt.toISOString(),
    };
  }

  // ── Eco Transactions ───────────────────────────────────────────────────────
  static async addEcoTransaction(tx: DbEcoTransaction): Promise<DbEcoTransaction> {
    const created = await prisma.ecoTransaction.create({
      data: {
        id: tx.id,
        userId: tx.user_id,
        type: tx.type,
        credits: tx.credits,
        source: tx.source,
        referenceId: tx.reference_id,
        description: tx.description || null,
      },
    });

    // Update user balance
    const user = await prisma.user.findUnique({ where: { id: tx.user_id } });
    if (user) {
      const delta = tx.type === 'EARNED' || tx.type === 'BONUS' ? tx.credits : -tx.credits;
      await prisma.user.update({
        where: { id: tx.user_id },
        data: { ecoCredits: Math.max(0, user.ecoCredits + delta) },
      });
    }

    return {
      id: created.id,
      user_id: created.userId,
      type: created.type as any,
      credits: created.credits,
      source: created.source,
      reference_id: created.referenceId,
      description: created.description || undefined,
      created_at: created.createdAt.toISOString(),
    };
  }

  static async hasEcoCreditForReference(userId: string, referenceId: string): Promise<boolean> {
    const existing = await prisma.ecoTransaction.findFirst({
      where: { userId, referenceId },
    });
    return Boolean(existing);
  }

  static async getUserLedgerBalance(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user ? user.ecoCredits : 0;
  }

  // ── Notifications ──────────────────────────────────────────────────────────
  static async getNotifications(userId: string, recipientRole?: RecipientRole): Promise<DbNotification[]> {
    const notifs = await prisma.notification.findMany({
      where: {
        OR: [
          { userId },
          { recipientId: userId },
          { recipientId: 'all' },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return notifs
      .filter((n) => !recipientRole || n.recipientRole === recipientRole)
      .map((n) => ({
        id: n.id,
        user_id: n.userId,
        recipient_id: n.recipientId || undefined,
        recipient_role: n.recipientRole as any,
        title: n.title,
        message: n.message,
        type: n.type,
        is_read: n.isRead,
        read: n.isRead,
        pickup_id: n.pickupId || undefined,
        reward_id: n.rewardId || undefined,
        created_at: n.createdAt.toISOString(),
      }));
  }

  static async addNotification(notif: DbNotification): Promise<DbNotification> {
    const created = await prisma.notification.create({
      data: {
        id: notif.id,
        userId: notif.user_id,
        recipientId: notif.recipient_id || notif.user_id,
        recipientRole: notif.recipient_role || 'user',
        title: notif.title,
        message: notif.message,
        type: notif.type,
        isRead: notif.is_read || notif.read || false,
        pickupId: notif.pickup_id || null,
        rewardId: notif.reward_id || null,
      },
    });

    return {
      id: created.id,
      user_id: created.userId,
      recipient_id: created.recipientId || undefined,
      recipient_role: created.recipientRole as any,
      title: created.title,
      message: created.message,
      type: created.type,
      is_read: created.isRead,
      read: created.isRead,
      created_at: created.createdAt.toISOString(),
    };
  }

  static async markNotificationRead(id: string): Promise<boolean> {
    try {
      await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });
      return true;
    } catch {
      return false;
    }
  }

  // ── User Activities ────────────────────────────────────────────────────────
  static async getUserActivities(userId: string): Promise<DbUserActivity[]> {
    const acts = await prisma.userActivity.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
    });

    return acts.map((a) => ({
      id: a.id,
      user_id: a.userId,
      activity_type: a.activityType as any,
      title: a.title,
      description: a.description,
      pickup_id: a.pickupId || undefined,
      scan_id: a.scanId || undefined,
      reward_id: a.rewardId || undefined,
      amount: a.amount || undefined,
      eco_credits: a.ecoCredits || undefined,
      waste_material: a.wasteMaterial || undefined,
      weight: a.weight || undefined,
      status: a.status || undefined,
      timestamp: a.timestamp.toISOString(),
    }));
  }

  static async addUserActivity(act: DbUserActivity): Promise<DbUserActivity> {
    const created = await prisma.userActivity.create({
      data: {
        id: act.id,
        userId: act.user_id,
        activityType: act.activity_type,
        title: act.title,
        description: act.description,
        pickupId: act.pickup_id || null,
        scanId: act.scan_id || null,
        rewardId: act.reward_id || null,
        amount: act.amount || null,
        ecoCredits: act.eco_credits || null,
        wasteMaterial: act.waste_material || null,
        weight: act.weight || null,
        status: act.status || null,
      },
    });

    return {
      id: created.id,
      user_id: created.userId,
      activity_type: created.activityType as any,
      title: created.title,
      description: created.description,
      timestamp: created.timestamp.toISOString(),
    };
  }

  // ── Admin Stats ────────────────────────────────────────────────────────────
  static async getAdminStats(): Promise<AdminStatsData> {
    const totalUsers = await prisma.user.count();
    const totalCollectors = await prisma.collector.count();
    const verifiedCollectors = await prisma.collector.count({ where: { verificationStatus: 'VERIFIED' } });
    const totalPickups = await prisma.pickupRequest.count();
    const completedPickups = await prisma.pickupRequest.count({ where: { status: 'COMPLETED' } });

    const completedList = await prisma.pickupRequest.findMany({ where: { status: 'COMPLETED' } });
    const totalWasteRecycled = completedList.reduce((acc, p) => acc + (p.actualWeight || p.estimatedWeight || 0), 0);

    const payments = await prisma.payment.findMany({ where: { paymentStatus: 'PAID' } });
    const totalTransactionValue = payments.reduce((acc, p) => acc + p.amount, 0);

    const ecoTxs = await prisma.ecoTransaction.findMany({ where: { type: 'EARNED' } });
    const ecoCreditsIssued = ecoTxs.reduce((acc, t) => acc + t.credits, 0);

    const activeRewards = await prisma.rewardItem.count({ where: { active: true } });

    const recentPickups = await this.getPickups();
    const recentPayments = payments.map((p) => ({
      id: p.id,
      pickup_id: p.pickupId,
      user_id: p.userId,
      collector_id: p.collectorId,
      amount: p.amount,
      payment_method: p.paymentMethod as any,
      payment_status: p.paymentStatus as any,
      transaction_reference: p.transactionRef,
      created_at: p.createdAt.toISOString(),
    }));

    const wasteByCategory: Record<string, number> = {};
    for (const p of completedList) {
      const cat = p.wasteCategory || 'Dry Recyclables';
      wasteByCategory[cat] = (wasteByCategory[cat] || 0) + (p.actualWeight || p.estimatedWeight || 0);
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
      wasteByCategory,
      recentPickups: recentPickups.slice(0, 8),
      recentPayments: recentPayments.slice(0, 8),
    };
  }

  // ── Point Rules ────────────────────────────────────────────────────────────
  static async getPointRules(): Promise<DbPointRule[]> {
    await this.seedDefaultDataIfEmpty();
    const rules = await prisma.pointRule.findMany({ orderBy: { category: 'asc' } });
    return rules.map((r) => ({
      id: r.id,
      category: r.category,
      points_per_kg: r.pointsPerKg,
      min_weight_kg: r.minWeightKg,
      active: r.active,
      updated_at: r.updatedAt.toISOString(),
    }));
  }

  static async getPointRuleForCategory(category: string): Promise<DbPointRule | null> {
    const rule = await prisma.pointRule.findFirst({
      where: {
        category: { equals: category },
        active: true,
      },
    });
    if (rule) {
      return {
        id: rule.id,
        category: rule.category,
        points_per_kg: rule.pointsPerKg,
        min_weight_kg: rule.minWeightKg,
        active: rule.active,
        updated_at: rule.updatedAt.toISOString(),
      };
    }
    return null;
  }

  static async savePointRule(rule: { category: string; points_per_kg: number; min_weight_kg?: number; active?: boolean }): Promise<DbPointRule> {
    const updated = await prisma.pointRule.upsert({
      where: { category: rule.category },
      update: {
        pointsPerKg: rule.points_per_kg,
        ...(rule.min_weight_kg !== undefined && { minWeightKg: rule.min_weight_kg }),
        ...(rule.active !== undefined && { active: rule.active }),
      },
      create: {
        category: rule.category,
        pointsPerKg: rule.points_per_kg,
        minWeightKg: rule.min_weight_kg ?? 0.5,
        active: rule.active ?? true,
      },
    });
    return {
      id: updated.id,
      category: updated.category,
      points_per_kg: updated.pointsPerKg,
      min_weight_kg: updated.minWeightKg,
      active: updated.active,
      updated_at: updated.updatedAt.toISOString(),
    };
  }

  // ── User Achievements ──────────────────────────────────────────────────────
  static async getUserAchievements(userId: string): Promise<DbUserAchievement[]> {
    const achs = await prisma.userAchievement.findMany({
      where: { userId },
      orderBy: { unlockedAt: 'desc' },
    });
    return achs.map((a) => ({
      id: a.id,
      user_id: a.userId,
      badge_key: a.badgeKey,
      title: a.title,
      description: a.description,
      icon: a.icon,
      bonus_credits: a.bonusCredits,
      unlocked_at: a.unlockedAt.toISOString(),
    }));
  }

  static async awardAchievement(ach: {
    userId: string;
    badgeKey: string;
    title: string;
    description: string;
    icon?: string;
    bonusCredits?: number;
  }): Promise<{ achievement: DbUserAchievement; newlyUnlocked: boolean }> {
    const existing = await prisma.userAchievement.findUnique({
      where: { userId_badgeKey: { userId: ach.userId, badgeKey: ach.badgeKey } },
    });

    if (existing) {
      return {
        achievement: {
          id: existing.id,
          user_id: existing.userId,
          badge_key: existing.badgeKey,
          title: existing.title,
          description: existing.description,
          icon: existing.icon,
          bonus_credits: existing.bonusCredits,
          unlocked_at: existing.unlockedAt.toISOString(),
        },
        newlyUnlocked: false,
      };
    }

    const created = await prisma.userAchievement.create({
      data: {
        userId: ach.userId,
        badgeKey: ach.badgeKey,
        title: ach.title,
        description: ach.description,
        icon: ach.icon || '🏆',
        bonusCredits: ach.bonusCredits || 0,
      },
    });

    if (ach.bonusCredits && ach.bonusCredits > 0) {
      await this.addEcoTransaction({
        id: `tx-bonus-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        user_id: ach.userId,
        type: 'BONUS',
        credits: ach.bonusCredits,
        source: 'achievement_unlocked',
        reference_id: `ach_${created.id}`,
        description: `Unlocked Achievement: ${ach.title}`,
        created_at: new Date().toISOString(),
      });
    }

    return {
      achievement: {
        id: created.id,
        user_id: created.userId,
        badge_key: created.badgeKey,
        title: created.title,
        description: created.description,
        icon: created.icon,
        bonus_credits: created.bonusCredits,
        unlocked_at: created.unlockedAt.toISOString(),
      },
      newlyUnlocked: true,
    };
  }
}

