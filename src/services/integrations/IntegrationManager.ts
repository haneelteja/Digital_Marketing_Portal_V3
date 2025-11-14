/**
 * Integration Manager
 * Manages all third-party integrations
 * 
 * This service handles registration, configuration, and execution of integrations
 */

import { BaseIntegrationService, IntegrationConfig, PostData, IntegrationResult } from './BaseIntegrationService';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { logger } from '../../utils/logger';

export class IntegrationManager {
  private integrations: Map<string, BaseIntegrationService> = new Map();
  private initialized: boolean = false;

  /**
   * Register an integration service
   */
  registerIntegration(integrationId: string, service: BaseIntegrationService): void {
    this.integrations.set(integrationId, service);
    logger.info('Integration registered', { integrationId });
  }

  /**
   * Initialize all integrations
   */
  async initializeAll(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load integrations from database
      const { data: configs, error } = await supabaseAdmin
        .from('integration_configs')
        .select('*')
        .eq('enabled', true);

      if (error) {
        logger.error('Failed to load integrations', error);
        return;
      }

      // Initialize each integration
      for (const config of configs || []) {
        try {
          const service = await this.createIntegrationService(config);
          if (service) {
            await service.initialize();
            this.integrations.set(config.id, service);
          }
        } catch (err) {
          logger.error('Failed to initialize integration', err, { integrationId: config.id });
        }
      }

      this.initialized = true;
      logger.info('All integrations initialized', { count: this.integrations.size });
    } catch (error) {
      logger.error('Error initializing integrations', error);
    }
  }

  /**
   * Create integration service instance based on type
   */
  private async createIntegrationService(config: IntegrationConfig): Promise<BaseIntegrationService | null> {
    // Dynamic import based on integration type
    // This allows for lazy loading of integration modules
    try {
      switch (config.type) {
        case 'FACEBOOK':
          const { FacebookIntegrationService } = await import('./providers/FacebookIntegrationService');
          return new FacebookIntegrationService(config);
        case 'INSTAGRAM':
          const { InstagramIntegrationService } = await import('./providers/InstagramIntegrationService');
          return new InstagramIntegrationService(config);
        case 'TWITTER':
          const { TwitterIntegrationService } = await import('./providers/TwitterIntegrationService');
          return new TwitterIntegrationService(config);
        case 'LINKEDIN':
          const { LinkedInIntegrationService } = await import('./providers/LinkedInIntegrationService');
          return new LinkedInIntegrationService(config);
        default:
          logger.warn('Unknown integration type', { type: config.type });
          return null;
      }
    } catch (error) {
      logger.error('Error creating integration service', error, { type: config.type });
      return null;
    }
  }

  /**
   * Post content to all enabled integrations for a platform
   */
  async postToIntegrations(postData: PostData, platform: string): Promise<IntegrationResult[]> {
    const results: IntegrationResult[] = [];

    // Find integrations for the specified platform
    const relevantIntegrations = Array.from(this.integrations.values()).filter(
      (service) => service.getConfig().type === platform.toUpperCase() && service.getConfig().enabled
    );

    if (relevantIntegrations.length === 0) {
      logger.warn('No integrations found for platform', { platform });
      return results;
    }

    // Post to all relevant integrations
    for (const service of relevantIntegrations) {
      try {
        const result = await service.postContent(postData);
        results.push(result);

        // Log the result
        if (result.success) {
          logger.info('Content posted successfully', {
            integrationId: service.getConfig().id,
            postId: postData.id,
            externalId: result.externalId,
          });
        } else {
          logger.error('Failed to post content', new Error(result.error || 'Unknown error'), {
            integrationId: service.getConfig().id,
            postId: postData.id,
          });
        }
      } catch (error) {
        logger.error('Error posting to integration', error, {
          integrationId: service.getConfig().id,
          postId: postData.id,
        });
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Get all registered integrations
   */
  getIntegrations(): BaseIntegrationService[] {
    return Array.from(this.integrations.values());
  }

  /**
   * Get integration by ID
   */
  getIntegration(integrationId: string): BaseIntegrationService | undefined {
    return this.integrations.get(integrationId);
  }

  /**
   * Reload integrations from database
   */
  async reload(): Promise<void> {
    this.integrations.clear();
    this.initialized = false;
    await this.initializeAll();
  }
}

// Singleton instance
export const integrationManager = new IntegrationManager();




