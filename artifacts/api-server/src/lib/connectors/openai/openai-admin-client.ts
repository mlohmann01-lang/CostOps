/**
 * OpenAI Admin Usage/Cost Client (Part 3)
 *
 * Read-only HTTP client for OpenAI Admin API.
 * Handles pagination, retry-after, error classification, and structured logging.
 */

import { openaiCredentialManager } from './openai-credentials.js';
import { logger } from '../../logger.js';

export class OpenAIAPIError extends Error {
  readonly statusCode: number;
  readonly errorType: 'AUTH_FAILURE' | 'RATE_LIMITED' | 'NOT_FOUND' | 'SERVER_ERROR' | 'UNKNOWN';
  readonly retryAfterMs?: number;

  constructor(
    message: string,
    statusCode: number,
    errorType: 'AUTH_FAILURE' | 'RATE_LIMITED' | 'NOT_FOUND' | 'SERVER_ERROR' | 'UNKNOWN',
    retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'OpenAIAPIError';
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.retryAfterMs = retryAfterMs;
  }
}

export type UsageBucket = {
  projectId: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  usageDate: string; // YYYY-MM-DD
};

export type CostBucket = {
  projectId: string;
  modelId: string;
  costUSD: number;
  costDate: string; // YYYY-MM-DD
};

export type ProjectInfo = {
  projectId: string;
  projectName: string;
  status: 'active' | 'archived' | 'deleted';
  createdAt: string;
};

export type UserInfo = {
  userId: string;
  userName: string;
  email: string;
  status: 'active' | 'inactive';
  createdAt: string;
};

export interface OpenAIAdminClient {
  /**
   * Validate credentials and check API access
   */
  validateCredentials(): Promise<boolean>;

  /**
   * Fetch usage data for a date range
   * Supports pagination via cursor
   */
  getUsageData(
    startDate: string,
    endDate: string,
    cursor?: string,
  ): Promise<{
    data: UsageBucket[];
    nextCursor?: string;
    hasMore: boolean;
  }>;

  /**
   * Fetch cost data for a date range
   * Supports pagination via cursor
   */
  getCostData(
    startDate: string,
    endDate: string,
    cursor?: string,
  ): Promise<{
    data: CostBucket[];
    nextCursor?: string;
    hasMore: boolean;
  }>;

  /**
   * List all projects accessible to the API key
   */
  listProjects(cursor?: string): Promise<{
    data: ProjectInfo[];
    nextCursor?: string;
    hasMore: boolean;
  }>;

  /**
   * List all users in the organization
   */
  listUsers(cursor?: string): Promise<{
    data: UserInfo[];
    nextCursor?: string;
    hasMore: boolean;
  }>;
}

export class OpenAIAdminClientImpl implements OpenAIAdminClient {
  private readonly baseUrl = 'https://api.openai.com/v1';
  private readonly organizationHeader: Record<string, string>;

  constructor() {
    const org = openaiCredentialManager.getOrganizationId();
    this.organizationHeader = org ? { 'OpenAI-Organization': org } : {};
  }

  /**
   * Make authenticated request with error handling
   */
  private async request<T>(
    method: 'GET',
    path: string,
    query?: Record<string, string>,
  ): Promise<T> {
    const creds = openaiCredentialManager.getCredentials();
    if (!creds) {
      throw new OpenAIAPIError('OpenAI credentials not configured', 0, 'AUTH_FAILURE');
    }

    const url = new URL(path.startsWith('http') ? path : `${this.baseUrl}${path}`);
    if (query) {
      Object.entries(query).forEach(([k, v]) => url.searchParams.append(k, v));
    }

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: {
          Authorization: `Bearer ${creds.apiKey}`,
          'Content-Type': 'application/json',
          ...this.organizationHeader,
        },
      });

      if (!response.ok) {
        const errorType = this.classifyError(response.status);
        const retryAfter = response.headers.get('retry-after');
        const retryAfterMs = retryAfter ? parseInt(retryAfter) * 1000 : undefined;

        throw new OpenAIAPIError(
          `OpenAI API error: ${response.status} ${response.statusText}`,
          response.status,
          errorType,
          retryAfterMs,
        );
      }

      const data = (await response.json()) as T;
      return data;
    } catch (error) {
      if (error instanceof OpenAIAPIError) {
        throw error;
      }
      logger.error(
        {
          error,
          path,
          component: 'openai-admin-client',
        },
        'Unexpected error in OpenAI API request',
      );
      throw new OpenAIAPIError('Unexpected error calling OpenAI API', 0, 'UNKNOWN');
    }
  }

  /**
   * Classify HTTP status to error type
   */
  private classifyError(statusCode: number): OpenAIAPIError['errorType'] {
    if (statusCode === 401 || statusCode === 403) {
      return 'AUTH_FAILURE';
    }
    if (statusCode === 429) {
      return 'RATE_LIMITED';
    }
    if (statusCode === 404) {
      return 'NOT_FOUND';
    }
    if (statusCode >= 500) {
      return 'SERVER_ERROR';
    }
    return 'UNKNOWN';
  }

  async validateCredentials(): Promise<boolean> {
    try {
      // Simple request to validate credentials
      // GET /account/billing/credit_grants (minimal read, no cost impact)
      const result = await this.request<{ object: string }>('/billing/credit_grants');
      return result.object === 'list';
    } catch (error) {
      if (error instanceof OpenAIAPIError) {
        logger.warn(
          {
            errorType: error.errorType,
            statusCode: error.statusCode,
            component: 'openai-admin-client',
          },
          'Credential validation failed',
        );
      }
      return false;
    }
  }

  async getUsageData(
    startDate: string,
    endDate: string,
    cursor?: string,
  ): Promise<{ data: UsageBucket[]; nextCursor?: string; hasMore: boolean }> {
    const query: Record<string, string> = {
      start_date: startDate,
      end_date: endDate,
      limit: '100',
    };
    if (cursor) {
      query.cursor = cursor;
    }

    const result = await this.request<{
      data: Array<{ project_id?: string; model?: string; tokens_in?: number; tokens_out?: number; date?: string }>;
      has_more?: boolean;
      cursor?: string;
    }>('/usage', query);

    const data: UsageBucket[] = (result.data || []).map((item) => ({
      projectId: item.project_id || 'unknown',
      modelId: item.model || 'unknown',
      inputTokens: item.tokens_in || 0,
      outputTokens: item.tokens_out || 0,
      usageDate: item.date || new Date().toISOString().split('T')[0],
    }));

    return {
      data,
      nextCursor: result.cursor,
      hasMore: result.has_more ?? false,
    };
  }

  async getCostData(
    startDate: string,
    endDate: string,
    cursor?: string,
  ): Promise<{ data: CostBucket[]; nextCursor?: string; hasMore: boolean }> {
    const query: Record<string, string> = {
      start_date: startDate,
      end_date: endDate,
      limit: '100',
    };
    if (cursor) {
      query.cursor = cursor;
    }

    const result = await this.request<{
      data: Array<{ project_id?: string; model?: string; amount?: number; date?: string }>;
      has_more?: boolean;
      cursor?: string;
    }>('/billing/costs', query);

    const data: CostBucket[] = (result.data || []).map((item) => ({
      projectId: item.project_id || 'unknown',
      modelId: item.model || 'unknown',
      costUSD: (item.amount || 0) / 100, // Convert from cents
      costDate: item.date || new Date().toISOString().split('T')[0],
    }));

    return {
      data,
      nextCursor: result.cursor,
      hasMore: result.has_more ?? false,
    };
  }

  async listProjects(cursor?: string): Promise<{ data: ProjectInfo[]; nextCursor?: string; hasMore: boolean }> {
    const query: Record<string, string> = { limit: '100' };
    if (cursor) {
      query.cursor = cursor;
    }

    const result = await this.request<{
      data: Array<{
        id?: string;
        name?: string;
        status?: string;
        created_at?: string;
      }>;
      has_more?: boolean;
      cursor?: string;
    }>('/organization/projects', query);

    const data: ProjectInfo[] = (result.data || []).map((item) => ({
      projectId: item.id || 'unknown',
      projectName: item.name || 'unknown',
      status: (item.status as 'active' | 'archived' | 'deleted') || 'active',
      createdAt: item.created_at || new Date().toISOString(),
    }));

    return {
      data,
      nextCursor: result.cursor,
      hasMore: result.has_more ?? false,
    };
  }

  async listUsers(cursor?: string): Promise<{ data: UserInfo[]; nextCursor?: string; hasMore: boolean }> {
    const query: Record<string, string> = { limit: '100' };
    if (cursor) {
      query.cursor = cursor;
    }

    const result = await this.request<{
      data: Array<{
        id?: string;
        name?: string;
        email?: string;
        status?: string;
        created_at?: string;
      }>;
      has_more?: boolean;
      cursor?: string;
    }>('/organization/users', query);

    const data: UserInfo[] = (result.data || []).map((item) => ({
      userId: item.id || 'unknown',
      userName: item.name || 'unknown',
      email: item.email || 'unknown',
      status: (item.status as 'active' | 'inactive') || 'active',
      createdAt: item.created_at || new Date().toISOString(),
    }));

    return {
      data,
      nextCursor: result.cursor,
      hasMore: result.has_more ?? false,
    };
  }
}

export const openaiAdminClient: OpenAIAdminClient = new OpenAIAdminClientImpl();
