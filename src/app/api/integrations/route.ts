/**
 * API Route for Third-Party Integrations
 * 
 * GET: List all integrations
 * POST: Create new integration
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { ok, badRequest, unauthorized, serverError } from '../../../../lib/apiResponse';
import { logger } from '@/utils/logger';

// GET /api/integrations - List all integrations
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

    // Check user role - only IT_ADMIN can view integrations
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (userData?.role !== 'IT_ADMIN') {
      return unauthorized('Only IT Admin can view integrations');
    }

    const { data, error } = await supabaseAdmin
      .from('integration_configs')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching integrations', error);
      return serverError('Failed to fetch integrations');
    }

    // Remove sensitive credentials from response
    const safeData = (data || []).map((integration: any) => ({
      ...integration,
      credentials: integration.credentials ? { configured: true } : { configured: false },
    }));

    return ok({ integrations: safeData });
  } catch (error) {
    logger.error('Error in GET /api/integrations', error);
    return serverError();
  }
}

// POST /api/integrations - Create new integration
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

    // Check user role - only IT_ADMIN can create integrations
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (userData?.role !== 'IT_ADMIN') {
      return unauthorized('Only IT Admin can create integrations');
    }

    const body = await request.json();
    const { name, type, credentials, settings, enabled } = body;

    // Validation
    if (!name || !type) {
      return badRequest('Name and type are required');
    }

    const validTypes = ['FACEBOOK', 'INSTAGRAM', 'TWITTER', 'LINKEDIN', 'CUSTOM'];
    if (!validTypes.includes(type)) {
      return badRequest(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
    }

    const { data, error } = await supabaseAdmin
      .from('integration_configs')
      .insert({
        name,
        type,
        credentials: credentials || {},
        settings: settings || {},
        enabled: enabled !== undefined ? enabled : true,
        created_by: currentUser.id,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating integration', error);
      return serverError('Failed to create integration');
    }

    logger.info('Integration created', { integrationId: data.id, type });

    return ok({ integration: data });
  } catch (error) {
    logger.error('Error in POST /api/integrations', error);
    return serverError();
  }
}




