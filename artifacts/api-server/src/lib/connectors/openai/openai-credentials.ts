/**
 * OpenAI Credentials Handling (Part 2)
 *
 * Environment-backed credential storage with production warnings.
 * The API key is NEVER logged or exposed in error messages.
 */

import { logger } from '../../logger.js';

export type OpenAICredentialStatus = 'VALID' | 'INVALID' | 'EXPIRED' | 'MISSING' | 'MISCONFIGURED';

export type OpenAICredentials = {
  apiKey: string; // Never log this
  organizationId?: string;
};

export class OpenAICredentialManager {
  private apiKey?: string;
  private organizationId?: string;
  private loadedAt: Date = new Date();

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.organizationId = process.env.OPENAI_ORGANIZATION_ID;

    // Production warning if credentials not set
    if (!this.apiKey && process.env.NODE_ENV === 'production') {
      logger.warn(
        { component: 'openai-credentials' },
        'OPENAI_API_KEY not set in production — OpenAI connector will be unavailable',
      );
    }
  }

  /**
   * Get credentials if available
   */
  getCredentials(): OpenAICredentials | null {
    if (!this.apiKey) {
      return null;
    }
    return {
      apiKey: this.apiKey,
      organizationId: this.organizationId,
    };
  }

  /**
   * Check if credentials are configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get masked display of API key (for UI/logs)
   * Shows only first 7 and last 4 chars, middle is *
   */
  getMaskedApiKey(): string {
    if (!this.apiKey) return '<not configured>';
    if (this.apiKey.length <= 11) return '***';
    return this.apiKey.substring(0, 7) + '*'.repeat(Math.max(1, this.apiKey.length - 11)) + this.apiKey.substring(this.apiKey.length - 4);
  }

  /**
   * Get organization ID (safe to log)
   */
  getOrganizationId(): string | undefined {
    return this.organizationId;
  }

  /**
   * Validate credential format (basic check before API call)
   */
  validateFormat(): { valid: boolean; reason?: string } {
    if (!this.apiKey) {
      return { valid: false, reason: 'OPENAI_API_KEY not configured' };
    }

    // OpenAI API keys typically start with 'sk-'
    if (!this.apiKey.startsWith('sk-')) {
      return { valid: false, reason: 'API key format invalid (must start with sk-)' };
    }

    // Should be at least 20 chars
    if (this.apiKey.length < 20) {
      return { valid: false, reason: 'API key too short' };
    }

    return { valid: true };
  }

  /**
   * Get safe metadata for logs (never includes the key)
   */
  getSafeMetadata(): Record<string, unknown> {
    return {
      configured: this.isConfigured(),
      maskedKey: this.getMaskedApiKey(),
      hasOrganizationId: !!this.organizationId,
      loadedAt: this.loadedAt.toISOString(),
    };
  }
}

export const openaiCredentialManager = new OpenAICredentialManager();
