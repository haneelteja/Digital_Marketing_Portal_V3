/**
 * API Route for Posting to Third-Party Integrations
 * 
 * POST: Post approved content to third-party platforms
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { ok, badRequest, unauthorized, serverError, notFound } from '@/lib/apiResponse';
import { logger } from '@/utils/logger';
import { integrationManager } from '@/services/integrations/IntegrationManager';
import { PostData } from '@/services/integrations/BaseIntegrationService';

// POST /api/integrations/post - Post content to integrations
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized();
    }

    const token = authHeader.substring(7);
    const { data: { user: currentUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !currentUser) {
      return unauthorized('Invalid token');
    }

    const body = await request.json();
    const { postId, campaignUploadId, platform, integrationIds } = body;

    // Validation
    if (!postId && !campaignUploadId) {
      return badRequest('Either postId or campaignUploadId is required');
    }

    if (!platform) {
      return badRequest('Platform is required');
    }

    // Get post data
    let postData: PostData | null = null;

    if (postId) {
      // Get calendar entry
      const { data: entry, error: entryError } = await supabaseAdmin
        .from('calendar_entries')
        .select('*, clients(id, company_name)')
        .eq('id', postId)
        .single();

      if (entryError || !entry) {
        return notFound('Post not found');
      }

      // Check if post is approved
      const { data: upload } = await supabaseAdmin
        .from('post_uploads')
        .select('approved, file_url, file_type')
        .eq('entry_id', postId)
        .eq('approved', true)
        .single();

      if (!upload) {
        return badRequest('Post must be approved before posting to integrations');
      }

      postData = {
        id: entry.id,
        clientId: entry.client,
        content: entry.post_content || entry.content || '',
        imageUrl: upload.file_type?.startsWith('image') ? upload.file_url : undefined,
        videoUrl: upload.file_type?.startsWith('video') ? upload.file_url : undefined,
        platform: platform.toUpperCase(),
        scheduledDate: entry.date,
        hashtags: entry.hashtags ? entry.hashtags.split(',').map((h: string) => h.trim()) : [],
        metadata: {
          entryId: entry.id,
          clientName: (entry.clients as any)?.company_name,
        },
      };
    } else if (campaignUploadId) {
      // Get campaign upload
      const { data: upload, error: uploadError } = await supabaseAdmin
        .from('campaign_uploads')
        .select('*, social_media_campaigns(*, clients(id, company_name))')
        .eq('id', campaignUploadId)
        .single();

      if (uploadError || !upload) {
        return notFound('Campaign upload not found');
      }

      if (!upload.approved) {
        return badRequest('Campaign upload must be approved before posting');
      }

      const campaign = upload.social_media_campaigns as any;
      postData = {
        id: upload.id,
        clientId: campaign.client_id,
        content: upload.content || '',
        imageUrl: upload.file_type?.startsWith('image') ? upload.file_url : undefined,
        videoUrl: upload.file_type?.startsWith('video') ? upload.file_url : undefined,
        platform: platform.toUpperCase(),
        scheduledDate: campaign.start_date,
        hashtags: [],
        metadata: {
          campaignId: campaign.id,
          campaignName: campaign.campaign_name,
          clientName: campaign.clients?.company_name,
        },
      };
    }

    if (!postData) {
      return badRequest('Failed to prepare post data');
    }

    // Initialize integrations if not already done
    await integrationManager.initializeAll();

    // Post to integrations
    const results = await integrationManager.postToIntegrations(postData, platform);

    // Save integration post records
    const integrationPosts = results.map((result, index) => ({
      integration_id: integrationIds?.[index] || null,
      post_id: postId || null,
      campaign_upload_id: campaignUploadId || null,
      external_id: result.externalId,
      status: result.success ? 'posted' : 'failed',
      posted_at: result.success ? new Date().toISOString() : null,
      error_message: result.error,
      metadata: result.metadata || {},
    }));

    if (integrationPosts.length > 0) {
      await supabaseAdmin.from('integration_posts').insert(integrationPosts);
    }

    // Update calendar entry integration status if applicable
    if (postId) {
      const integrationStatus: Record<string, any> = {};
      results.forEach((result, index) => {
        integrationStatus[platform] = {
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

    logger.info('Content posted to integrations', {
      postId: postId || campaignUploadId,
      platform,
      successCount: results.filter((r) => r.success).length,
      totalCount: results.length,
    });

    return ok({
      success: results.some((r) => r.success),
      results,
      posted: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });
  } catch (error) {
    logger.error('Error in POST /api/integrations/post', error);
    return serverError();
  }
}




