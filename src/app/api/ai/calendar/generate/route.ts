/**
 * API Route for AI Calendar Generation
 * 
 * POST: Generate calendar entries using AI
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { ok, badRequest, unauthorized, serverError } from '@/lib/apiResponse';
import { logger } from '@/utils/logger';
import { calendarGenerationService, CalendarGenerationRequest } from '@/services/ai/CalendarGenerationService';

// POST /api/ai/calendar/generate - Generate calendar using AI
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

    // Check user role - only IT_ADMIN and AGENCY_ADMIN can generate calendars
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (userData?.role !== 'IT_ADMIN' && userData?.role !== 'AGENCY_ADMIN') {
      return unauthorized('Only IT Admin and Agency Admin can generate calendars');
    }

    const body = await request.json();
    const {
      clientId,
      startDate,
      endDate,
      contentType,
      frequency,
      themes,
      aiProvider,
      options,
    } = body as CalendarGenerationRequest;

    // Validation
    if (!startDate || !endDate) {
      return badRequest('Start date and end date are required');
    }

    // Create generation record
    const { data: generationRecord, error: genError } = await supabaseAdmin
      .from('ai_calendar_generations')
      .insert({
        client_id: clientId || null,
        generated_by: currentUser.id,
        start_date: startDate,
        end_date: endDate,
        frequency: frequency || 'weekly',
        ai_provider: aiProvider || 'openai',
        status: 'generating',
        request_metadata: {
          contentType,
          themes,
          options,
        },
      })
      .select()
      .single();

    if (genError) {
      logger.error('Error creating generation record', genError);
      return serverError('Failed to create generation record');
    }

    // Initialize AI service
    await calendarGenerationService.initialize(aiProvider);

    // Generate calendar
    const result = await calendarGenerationService.generateCalendar({
      clientId,
      startDate,
      endDate,
      contentType,
      frequency,
      themes,
      aiProvider,
      options,
    });

    // Update generation record
    const updateData: any = {
      entries_generated: result.totalEntries,
      result_metadata: result.metadata || {},
    };

    if (result.success) {
      // Save generated entries
      const saveResult = await calendarGenerationService.saveGeneratedCalendar(
        result.entries,
        currentUser.id
      );

      updateData.status = 'completed';
      updateData.entries_saved = saveResult.saved;
      updateData.completed_at = new Date().toISOString();

      if (saveResult.errors > 0) {
        updateData.error_message = `Failed to save ${saveResult.errors} entries`;
      }
    } else {
      updateData.status = 'failed';
      updateData.error_message = result.error;
    }

    await supabaseAdmin
      .from('ai_calendar_generations')
      .update(updateData)
      .eq('id', generationRecord.id);

    logger.info('AI calendar generation completed', {
      generationId: generationRecord.id,
      success: result.success,
      entriesGenerated: result.totalEntries,
    });

    return ok({
      success: result.success,
      generationId: generationRecord.id,
      entries: result.entries,
      totalEntries: result.totalEntries,
      clientIds: result.clientIds,
      error: result.error,
    });
  } catch (error) {
    logger.error('Error in POST /api/ai/calendar/generate', error);
    return serverError();
  }
}




