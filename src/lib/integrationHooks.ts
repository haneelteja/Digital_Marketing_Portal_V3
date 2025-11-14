/**
 * Integration Hooks
 * 
 * Helper functions to trigger integrations when posts are approved
 * This can be called from approval endpoints
 */

import { integrationManager } from '../services/integrations/IntegrationManager';
import { PostData } from '../services/integrations/BaseIntegrationService';
import { supabaseAdmin } from './supabaseAdmin';
import { logger } from '../utils/logger';

/**
 * Check if auto-posting is enabled for a platform
 */
export async function isAutoPostEnabled(platform: string): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin
      .from('integration_configs')
      .select('id, settings')
      .eq('enabled', true)
      .eq('type', platform.toUpperCase())
      .contains('settings', { autoPostOnApproval: true })
      .limit(1);

    return (data?.length || 0) > 0;
  } catch (error) {
    logger.error('Error checking auto-post settings', error);
    return false;
  }
}

/**
 * Post approved content to integrations
 */
export async function postToIntegrationsOnApproval(
  postId: string,
  platform?: string
): Promise<void> {
  try {
    // Initialize integrations if needed
    await integrationManager.initializeAll();

    // Get post data
    const { data: entry, error: entryError } = await supabaseAdmin
      .from('calendar_entries')
      .select('*, clients(id, company_name)')
      .eq('id', postId)
      .single();

    if (entryError || !entry) {
      logger.warn('Post not found for integration', { postId });
      return;
    }

    // Get approved upload
    const { data: upload } = await supabaseAdmin
      .from('post_uploads')
      .select('approved, file_url, file_type')
      .eq('entry_id', postId)
      .eq('approved', true)
      .single();

    if (!upload) {
      logger.warn('No approved upload found', { postId });
      return;
    }

    // Determine platform from entry or use provided
    const targetPlatform = platform || entry.platform || 'FACEBOOK';

    // Check if auto-posting is enabled
    const autoPostEnabled = await isAutoPostEnabled(targetPlatform);
    if (!autoPostEnabled) {
      logger.info('Auto-posting not enabled', { platform: targetPlatform });
      return;
    }

    // Prepare post data
    const postData: PostData = {
      id: entry.id,
      clientId: entry.client,
      content: entry.post_content || entry.content || '',
      imageUrl: upload.file_type?.startsWith('image') ? upload.file_url : undefined,
      videoUrl: upload.file_type?.startsWith('video') ? upload.file_url : undefined,
      platform: targetPlatform.toUpperCase(),
      scheduledDate: entry.date,
      hashtags: entry.hashtags ? entry.hashtags.split(',').map((h: string) => h.trim()) : [],
      metadata: {
        entryId: entry.id,
        clientName: (entry.clients as any)?.company_name,
      },
    };

    // Post to integrations
    const results = await integrationManager.postToIntegrations(postData, targetPlatform);

    // Save integration post records
    if (results.length > 0) {
      const integrationPosts = results.map((result) => ({
        post_id: postId,
        external_id: result.externalId,
        status: result.success ? 'posted' : 'failed',
        posted_at: result.success ? new Date().toISOString() : null,
        error_message: result.error,
        metadata: result.metadata || {},
      }));

      await supabaseAdmin.from('integration_posts').insert(integrationPosts);

      // Update calendar entry integration status
      const integrationStatus: Record<string, any> = {};
      results.forEach((result) => {
        integrationStatus[targetPlatform] = {
          posted: result.success,
          externalId: result.externalId,
          postedAt: result.success ? new Date().toISOString() : null,
        };
      });

      await supabaseAdmin
        .from('calendar_entries')
        .update({ integration_status: integrationStatus })
        .eq('id', postId);
    }

    logger.info('Content posted to integrations on approval', {
      postId,
      platform: targetPlatform,
      successCount: results.filter((r) => r.success).length,
    });
  } catch (error) {
    // Don't throw - this is a background operation
    logger.error('Error posting to integrations on approval', error, { postId });
  }
}




