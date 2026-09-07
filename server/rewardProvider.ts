import dotenv from 'dotenv';
dotenv.config();

export interface ProviderFulfillmentRequest {
  redemptionId: string;
  userId: string;
  providerRewardId?: string;
  provider?: string;
  creditsSpent: number;
  rewardValue?: string;
  userEmail?: string;
  userPhone?: string;
  partnerId?: string;
  codeTemplate?: string;
}

export interface ProviderFulfillmentResponse {
  success: boolean;
  providerTransactionId?: string;
  voucherCode?: string;
  voucherPin?: string;
  expiresAt?: string;
  instructions?: string;
  errorMessage?: string;
}

export class RewardProviderService {
  private providerType: string;
  private apiKey: string;
  private clientId: string;
  private baseUrl: string;

  constructor() {
    this.providerType = process.env.REWARD_PROVIDER_TYPE || 'none';
    this.apiKey = process.env.REWARD_PROVIDER_API_KEY || '';
    this.clientId = process.env.REWARD_PROVIDER_CLIENT_ID || '';
    this.baseUrl = process.env.REWARD_PROVIDER_BASE_URL || 'https://api.rewardprovider.com';
  }

  public isConfigured(): boolean {
    return this.providerType !== 'none' && Boolean(this.apiKey);
  }

  public getProviderName(): string {
    if (!this.isConfigured()) return 'UNCONFIGURED';
    return this.providerType.toUpperCase();
  }

  public async fulfillReward(req: ProviderFulfillmentRequest): Promise<ProviderFulfillmentResponse> {
    const provider = (req.provider || this.providerType || 'none').toLowerCase();

    // 1. Direct Partner Code Fulfillment (for active verified partners configured in database)
    if (provider === 'partner_direct' || provider === 'local_partner' || provider === 'partner') {
      const code = req.codeTemplate
        ? req.codeTemplate.replace(/XXXXXX/g, Math.random().toString(36).substring(2, 8).toUpperCase())
        : `ECO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      return {
        success: true,
        providerTransactionId: `PARTNER_TX_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        voucherCode: code,
        expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(),
        instructions: 'Present this verified digital voucher at partner checkout or enter code during online payment.',
      };
    }

    // 2. Real Authorized Digital Voucher Provider Integration (Xoxoday, Gyft, PineLabs, etc.)
    if (provider === 'xoxoday' || provider === 'gyft' || provider === 'pinelabs' || this.isConfigured()) {
      if (!this.apiKey) {
        return {
          success: false,
          errorMessage: 'Digital reward provider integration is not configured. Server environment variable REWARD_PROVIDER_API_KEY is missing.',
        };
      }

      try {
        const response = await fetch(`${this.baseUrl}/v1/orders/fulfill`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Client-ID': this.clientId,
          },
          body: JSON.stringify({
            productId: req.providerRewardId,
            referenceNo: req.redemptionId,
            recipientEmail: req.userEmail || 'user@ecoscan.in',
            recipientPhone: req.userPhone,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          return {
            success: false,
            errorMessage: errData.message || `Provider ${this.getProviderName()} API returned HTTP ${response.status}`,
          };
        }

        const data = await response.json();
        return {
          success: true,
          providerTransactionId: data.transactionId || data.orderId || `PROV_${Date.now()}`,
          voucherCode: data.voucherCode || data.code,
          voucherPin: data.pin || data.voucherPin,
          expiresAt: data.expiryDate || new Date(Date.now() + 180 * 86400000).toISOString(),
          instructions: data.redemptionInstructions || 'Use code on partner website/app.',
        };
      } catch (err: any) {
        return {
          success: false,
          errorMessage: `Reward provider communication error: ${err.message || 'Network request failed'}`,
        };
      }
    }

    // 3. Fallback when provider API key is not set
    return {
      success: false,
      errorMessage: 'No active reward provider configured. Digital rewards require server REWARD_PROVIDER_API_KEY.',
    };
  }
}

export const rewardProvider = new RewardProviderService();
