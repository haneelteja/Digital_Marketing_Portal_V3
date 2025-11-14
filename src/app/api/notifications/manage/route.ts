/**
 * API Route for Notification Management (IT Admin Only)
 * 
 * GET: Get notification statistics and templates
 * POST: Create notification template or rule
 * PUT: Update notification template or rule
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { ok, badRequest, unauthorized, serverError } from '@/lib/apiResponse';
import { logger } from '@/utils/logger';
import { notificationManagementService } from '@/services/notifications/NotificationManagementService';

// GET /api/notifications/manage - Get management data
export async function GET(request: NextRequest) {
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

    // Check user role - only IT_ADMIN can manage notifications
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (userData?.role !== 'IT_ADMIN') {
      return unauthorized('Only IT Admin can manage notifications');
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'stats', 'templates', 'rules'

    if (type === 'stats') {
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const stats = await notificationManagementService.getStats(startDate || undefined, endDate || undefined);
      return ok({ stats });
    } else if (type === 'templates') {
      const templates = await notificationManagementService.getTemplates();
      return ok({ templates });
    } else if (type === 'rules') {
      const rules = await notificationManagementService.getRules();
      return ok({ rules });
    }

    // Return all data
    const [stats, templates, rules] = await Promise.all([
      notificationManagementService.getStats(),
      notificationManagementService.getTemplates(),
      notificationManagementService.getRules(),
    ]);

    return ok({ stats, templates, rules });
  } catch (error) {
    logger.error('Error in GET /api/notifications/manage', error);
    return serverError();
  }
}

// POST /api/notifications/manage - Create template or rule
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

    // Check user role
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (userData?.role !== 'IT_ADMIN') {
      return unauthorized('Only IT Admin can manage notifications');
    }

    const body = await request.json();
    const { action, data: itemData } = body; // action: 'template' or 'rule'

    if (action === 'template') {
      const template = await notificationManagementService.createTemplate(itemData);
      return ok({ template });
    } else if (action === 'rule') {
      const rule = await notificationManagementService.createRule(itemData);
      return ok({ rule });
    }

    return badRequest('Invalid action. Must be "template" or "rule"');
  } catch (error) {
    logger.error('Error in POST /api/notifications/manage', error);
    return serverError();
  }
}

// PUT /api/notifications/manage - Update template or rule
export async function PUT(request: NextRequest) {
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

    // Check user role
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (userData?.role !== 'IT_ADMIN') {
      return unauthorized('Only IT Admin can manage notifications');
    }

    const body = await request.json();
    const { action, id, data: updates } = body;

    if (!id) {
      return badRequest('ID is required');
    }

    if (action === 'template') {
      const template = await notificationManagementService.updateTemplate(id, updates);
      return ok({ template });
    } else if (action === 'rule') {
      // Update rule (similar to template)
      const { data, error } = await supabaseAdmin
        .from('notification_rules')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating notification rule', error);
        return serverError('Failed to update rule');
      }

      return ok({ rule: data });
    }

    return badRequest('Invalid action. Must be "template" or "rule"');
  } catch (error) {
    logger.error('Error in PUT /api/notifications/manage', error);
    return serverError();
  }
}




