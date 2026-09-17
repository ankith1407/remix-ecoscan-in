import { DbService, prisma } from './dbService';
import { rewardProvider } from '../rewardProvider';
import { DbEcoTransaction, DbRewardRedemption } from '../db';

export interface WalletAndImpactSummary {
  ecoCredits: number;
  lifetimeEarned: number;
  totalWasteRecycledKg: number;
  co2OffsetKg: number;
  treesSaved: number;
  waterPreservedLiters: number;
  recentTransactions: DbEcoTransaction[];
  activeVouchers: DbRewardRedemption[];
  achievements: any[];
}

export class RewardsService {
  /**
   * Idempotently award EcoCredits to a user upon successful pickup completion.
   */
  static async awardPickupPoints(
    userId: string,
    pickupId: string,
    wasteCategory: string,
    actualWeight: number
  ): Promise<{ success: boolean; pointsEarned: number; alreadyAwarded: boolean }> {
    // 1. Check idempotency: Ensure points for this pickupId haven't already been issued
    const alreadyAwarded = await DbService.hasEcoCreditForReference(userId, pickupId);
    if (alreadyAwarded) {
      const existingTxs = await prisma.ecoTransaction.findMany({
        where: { userId, referenceId: pickupId },
      });
      const points = existingTxs.reduce((sum, tx) => sum + tx.credits, 0);
      return { success: true, pointsEarned: points, alreadyAwarded: true };
    }

    // 2. Fetch point rule for waste category
    const rule = await DbService.getPointRuleForCategory(wasteCategory);
    const pointsPerKg = rule ? rule.points_per_kg : 10;
    const weightToUse = actualWeight && actualWeight > 0 ? actualWeight : 1;
    const pointsEarned = Math.max(1, Math.round(weightToUse * pointsPerKg));

    // 3. Create EcoTransaction (this updates User.ecoCredits inside DbService.addEcoTransaction)
    const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await DbService.addEcoTransaction({
      id: txId,
      user_id: userId,
      type: 'EARNED',
      credits: pointsEarned,
      source: 'pickup_completion',
      reference_id: pickupId,
      description: `Earned ${pointsEarned} EcoCredits for recycling ${weightToUse}kg of ${wasteCategory}`,
      created_at: new Date().toISOString(),
    });

    // 4. Update user's total waste recycled
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          totalWasteRecycled: Number((user.totalWasteRecycled + weightToUse).toFixed(2)),
        },
      });
    }

    // 5. Add User Activity log
    await DbService.addUserActivity({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      activity_type: 'ECO_CREDITS_EARNED',
      title: 'EcoCredits Earned!',
      description: `You earned +${pointsEarned} EcoCredits for your ${wasteCategory} pickup (${weightToUse} kg).`,
      pickup_id: pickupId,
      eco_credits: pointsEarned,
      waste_material: wasteCategory,
      weight: weightToUse,
      timestamp: new Date().toISOString(),
    });

    // 6. Send Notification
    await DbService.addNotification({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      recipient_id: userId,
      recipient_role: 'user',
      title: '🌱 EcoCredits Credited!',
      message: `Congratulations! +${pointsEarned} EcoCredits have been added to your wallet for recycling ${weightToUse}kg of ${wasteCategory}.`,
      type: 'REWARD',
      pickup_id: pickupId,
      is_read: false,
      read: false,
      created_at: new Date().toISOString(),
    });

    // 7. Check and unlock achievements
    await this.checkUserAchievements(userId);

    return { success: true, pointsEarned, alreadyAwarded: false };
  }

  /**
   * Perform atomic reward redemption with credit deduction, stock update, and voucher creation.
   */
  static async redeemReward(
    userId: string,
    rewardId: string
  ): Promise<{ success: boolean; redemption?: any; errorMessage?: string }> {
    try {
      // Execute inside an isolated Prisma transaction for atomic safety
      const result = await prisma.$transaction(async (tx) => {
        // 1. Fetch user & verify balance
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) {
          throw new Error('User account not found.');
        }

        // 2. Fetch reward item & verify stock & active status
        const reward = await tx.rewardItem.findUnique({ where: { id: rewardId } });
        if (!reward || !reward.active) {
          throw new Error('Reward item is currently unavailable or inactive.');
        }

        if (reward.stock <= 0) {
          throw new Error('This reward item is currently out of stock.');
        }

        if (user.ecoCredits < reward.creditsRequired) {
          throw new Error(
            `Insufficient EcoCredits. You have ${user.ecoCredits} credits, but this reward requires ${reward.creditsRequired} credits.`
          );
        }

        // 3. Deduct credits & decrement stock
        await tx.user.update({
          where: { id: userId },
          data: { ecoCredits: user.ecoCredits - reward.creditsRequired },
        });

        await tx.rewardItem.update({
          where: { id: rewardId },
          data: { stock: reward.stock - 1 },
        });

        // 4. Generate redemption reference ID & call RewardProviderService
        const redemptionId = `rdm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const fulfillment = await rewardProvider.fulfillReward({
          redemptionId,
          userId,
          providerRewardId: reward.id,
          provider: 'partner_direct',
          creditsSpent: reward.creditsRequired,
          rewardValue: reward.discountValue,
          userEmail: user.email,
          userPhone: user.phone,
          partnerId: reward.partnerId,
          codeTemplate: reward.codeTemplate || 'ECO-XXXXXX',
        });

        if (!fulfillment.success || !fulfillment.voucherCode) {
          throw new Error(fulfillment.errorMessage || 'Failed to issue digital reward voucher.');
        }

        // 5. Record EcoTransaction (REDEEMED)
        const ecoTx = await tx.ecoTransaction.create({
          data: {
            id: `tx-rdm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            userId,
            type: 'REDEEMED',
            credits: reward.creditsRequired,
            source: 'reward_redemption',
            referenceId: redemptionId,
            description: `Redeemed '${reward.title}' for ${reward.creditsRequired} EcoCredits`,
          },
        });

        // 6. Create RewardRedemption record
        const redemption = await tx.rewardRedemption.create({
          data: {
            id: redemptionId,
            userId,
            rewardId: reward.id,
            partnerId: reward.partnerId,
            partnerName: reward.partnerName,
            rewardTitle: reward.title,
            discountValue: reward.discountValue,
            creditsSpent: reward.creditsRequired,
            provider: rewardProvider.getProviderName(),
            providerTransactionId: fulfillment.providerTransactionId || `PROV_${Date.now()}`,
            voucherCode: fulfillment.voucherCode,
            voucherPin: fulfillment.voucherPin || null,
            redemptionCode: fulfillment.voucherCode,
            redemptionDate: new Date().toLocaleDateString('en-IN'),
            expiryDate: fulfillment.expiresAt || reward.expiryDate,
            status: 'COMPLETED',
            redemptionStatus: 'ACTIVE',
          },
        });

        return { redemption, userCredits: user.ecoCredits - reward.creditsRequired, reward };
      });

      // Post-transaction notifications & activity logs
      await DbService.addUserActivity({
        id: `act-rdm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        user_id: userId,
        activity_type: 'REWARD_REDEEMED',
        title: 'Reward Redeemed!',
        description: `Successfully redeemed '${result.reward.title}' (${result.reward.discountValue}) for ${result.reward.creditsRequired} EcoCredits. Voucher: ${result.redemption.voucherCode}`,
        reward_id: rewardId,
        eco_credits: result.reward.creditsRequired,
        timestamp: new Date().toISOString(),
      });

      await DbService.addNotification({
        id: `notif-rdm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        user_id: userId,
        recipient_id: userId,
        recipient_role: 'user',
        title: '🎁 Reward Voucher Issued!',
        message: `Your voucher code '${result.redemption.voucherCode}' for ${result.reward.title} is ready to use!`,
        type: 'REWARD',
        reward_id: rewardId,
        is_read: false,
        read: false,
        created_at: new Date().toISOString(),
      });

      return { success: true, redemption: result.redemption };
    } catch (err: any) {
      return { success: false, errorMessage: err?.message || 'Failed to redeem reward.' };
    }
  }

  /**
   * Calculate full wallet ledger, eco impact statistics, and user achievements summary.
   */
  static async getWalletAndImpact(userId: string): Promise<WalletAndImpactSummary> {
    const user = await DbService.getUserById(userId);
    const ecoCredits = user ? user.eco_credits : 0;
    const totalWasteRecycledKg = user ? user.total_waste_recycled : 0;

    // Lifetime earned credits
    const earnedTxs = await prisma.ecoTransaction.findMany({
      where: { userId, type: { in: ['EARNED', 'BONUS'] } },
    });
    const lifetimeEarned = earnedTxs.reduce((sum, tx) => sum + tx.credits, 0);

    // Recent 20 transactions
    const txs = await prisma.ecoTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const recentTransactions: DbEcoTransaction[] = txs.map((t) => ({
      id: t.id,
      user_id: t.userId,
      type: t.type as any,
      credits: t.credits,
      source: t.source,
      reference_id: t.referenceId,
      description: t.description || undefined,
      created_at: t.createdAt.toISOString(),
    }));

    // Active digital vouchers redeemed
    const redemptions = await prisma.rewardRedemption.findMany({
      where: { userId, redemptionStatus: 'ACTIVE' },
      orderBy: { redeemedAt: 'desc' },
    });
    const activeVouchers: DbRewardRedemption[] = redemptions.map((r) => ({
      id: r.id,
      user_id: r.userId,
      reward_id: r.rewardId,
      partner_id: r.partnerId || undefined,
      partner_name: r.partnerName || undefined,
      reward_title: r.rewardTitle || undefined,
      discount_value: r.discountValue || undefined,
      credits_spent: r.creditsSpent,
      voucher_code: r.voucherCode,
      voucher_pin: r.voucherPin || undefined,
      redemption_code: r.redemptionCode,
      redemption_date: r.redemptionDate || undefined,
      redeemed_at: r.redeemedAt.toISOString(),
      expiry_date: r.expiryDate || undefined,
      status: r.status,
      redemption_status: r.redemptionStatus,
    }));

    // Scientific Eco Impact conversions:
    // 1 kg waste = 1.5 kg CO2 offset, 0.04 trees saved, 15 L water saved
    const co2OffsetKg = Number((totalWasteRecycledKg * 1.5).toFixed(1));
    const treesSaved = Number((totalWasteRecycledKg * 0.04).toFixed(1));
    const waterPreservedLiters = Math.round(totalWasteRecycledKg * 15);

    // Achievements
    const achievements = await DbService.getUserAchievements(userId);

    return {
      ecoCredits,
      lifetimeEarned,
      totalWasteRecycledKg,
      co2OffsetKg,
      treesSaved,
      waterPreservedLiters,
      recentTransactions,
      activeVouchers,
      achievements,
    };
  }

  /**
   * Evaluate user milestones and unlock badges
   */
  static async checkUserAchievements(userId: string): Promise<void> {
    const user = await DbService.getUserById(userId);
    if (!user) return;

    const completedPickups = await prisma.pickupRequest.count({
      where: { userId, status: 'COMPLETED' },
    });

    // Achievement 1: First Pickup Completed
    if (completedPickups >= 1) {
      await DbService.awardAchievement({
        userId,
        badgeKey: 'FIRST_PICKUP',
        title: 'Eco Pioneer',
        description: 'Completed your first doorstep waste pickup!',
        icon: '🌱',
        bonusCredits: 20,
      });
    }

    // Achievement 2: 50kg Waste Recycled
    if (user.total_waste_recycled >= 50) {
      await DbService.awardAchievement({
        userId,
        badgeKey: 'ECO_WARRIOR_50KG',
        title: 'Eco Warrior',
        description: 'Recycled over 50kg of household scrap waste!',
        icon: '🛡️',
        bonusCredits: 50,
      });
    }

    // Achievement 3: 100 EcoCredits Earned
    if (user.eco_credits >= 100) {
      await DbService.awardAchievement({
        userId,
        badgeKey: 'CENTURION_CREDITS',
        title: 'Green Centurion',
        description: 'Accumulated 100+ EcoCredits in your wallet!',
        icon: '👑',
        bonusCredits: 30,
      });
    }
  }
}
