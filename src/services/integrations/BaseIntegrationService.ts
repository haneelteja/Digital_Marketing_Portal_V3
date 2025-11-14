/**
 * Base Integration Service
 * Abstract base class for all third-party integrations
 * 
 * This provides a consistent interface for integrating with external services
 * such as social media platforms, marketing tools, etc.
 */

export interface IntegrationConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  credentials: Record<string, string>;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PostData {
  id: string;
  clientId: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  platform: string;
  scheduledDate?: string;
  hashtags?: string[];
  metadata?: Record<string, any>;
}

export interface IntegrationResult {
  success: boolean;
  externalId?: string;
  message?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export abstract class BaseIntegrationService {
  protected config: IntegrationConfig;

  constructor(config: IntegrationConfig) {
    this.config = config;
  }

  /**
   * Initialize the integration
   */
  abstract initialize(): Promise<void>;

  /**
   * Post content to the third-party platform
   */
  abstract postContent(postData: PostData): Promise<IntegrationResult>;

  /**
   * Verify connection/credentials
   */
  abstract verifyConnection(): Promise<boolean>;

  /**
   * Get integration status
   */
  abstract getStatus(): Promise<{
    connected: boolean;
    lastSync?: string;
    error?: string;
  }>;

  /**
   * Update configuration
   */
  updateConfig(config: Partial<IntegrationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): IntegrationConfig {
    return this.config;
  }
}




