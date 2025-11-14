import { NextRequest } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { ok, created, badRequest, unauthorized, forbidden, serverError } from '../../../../lib/apiResponse';
import { logger } from '@/utils/logger';

type Attachment = {
  filename: string;
  url: string;
  size: number;
  type: string;
};

type MonthlyAnalyticsRow = {
  id: string;
  client_id: string;
  month: string; // ISO date string (first day of month)
  uploaded_by: string;
  uploaded_at: string;
  attachments: Attachment[];
  created_at: string;
  updated_at: string;
};

// GET /api/monthly-analytics?clientId=...&month=...&limit=...
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized();
    }

    const token = authHeader.substring(7);
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !currentUser) {
      return unauthorized('Invalid token');
    }

    // Get user role and assigned clients
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role, assigned_clients')
      .eq('id', currentUser.id)
      .single();

    if (userError || !userData) {
      return unauthorized('User not found');
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const month = searchParams.get('month');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 500);

    let query = supabaseAdmin
      .from('monthly_analytics')
      .select(`
        id,
        client_id,
        month,
        uploaded_by,
        uploaded_at,
        attachments,
        created_at,
        updated_at,
        clients:client_id (company_name),
        uploader:uploaded_by (email, first_name, last_name)
      `)
      .order('uploaded_at', { ascending: false })
      .limit(limit);

    // Apply role-based filtering
    if (userData.role === 'CLIENT') {
      // Clients can only see their own analytics
      const assignedClients = Array.isArray(userData.assigned_clients) 
        ? userData.assigned_clients 
        : (typeof userData.assigned_clients === 'string' ? [userData.assigned_clients] : []);
      
      if (assignedClients.length === 0) {
        return ok({ data: [] });
      }
      
      query = query.in('client_id', assignedClients);
    } else if (userData.role === 'AGENCY_ADMIN') {
      // Agency admins see only their assigned clients
      const assignedClients = Array.isArray(userData.assigned_clients)
        ? userData.assigned_clients
        : (typeof userData.assigned_clients === 'string' ? [userData.assigned_clients] : []);
      
      if (assignedClients.length === 0) {
        return ok({ data: [] });
      }
      
      query = query.in('client_id', assignedClients);
    }
    // IT_ADMIN sees all (no filter)

    // Apply optional filters
    if (clientId) {
      query = query.eq('client_id', clientId);
    }
    if (month) {
      // month is in format YYYY-MM-DD (first day of month)
      query = query.eq('month', month);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[MonthlyAnalytics API] Error fetching monthly analytics:', error);
      console.error('[MonthlyAnalytics API] Error details:', JSON.stringify(error, null, 2));
      return serverError('Failed to fetch monthly analytics');
    }

    logger.debug('Raw data count', { count: data?.length || 0, component: 'MonthlyAnalytics API' });
    logger.debug('User role', { role: userData.role, component: 'MonthlyAnalytics API' });
    logger.debug('Assigned clients', { clients: userData.assigned_clients, component: 'MonthlyAnalytics API' });

    // Transform data for frontend
    const transformed = (data as unknown[] || []).map((row: unknown) => {
      const r = row as MonthlyAnalyticsRow & { 
        clients?: { company_name: string } | null;
        uploader?: { email: string; first_name: string; last_name: string } | null;
      };
      
      const clientName = (r.clients as { company_name: string } | null)?.company_name || 'Unknown Client';
      const uploaderName = r.uploader 
        ? `${r.uploader.first_name || ''} ${r.uploader.last_name || ''}`.trim() || r.uploader.email || 'Unknown'
        : 'Unknown';
      
      return {
        id: r.id,
        clientId: r.client_id,
        clientName,
        month: r.month,
        uploadedBy: r.uploaded_by,
        uploadedByName: uploaderName,
        uploadedAt: r.uploaded_at,
        attachments: (r.attachments as Attachment[]) || [],
        createdAt: r.created_at,
        updatedAt: r.updated_at
      };
    });

    logger.debug('Transformed records count', { count: transformed.length, component: 'MonthlyAnalytics API' });
    return ok({ data: transformed });
  } catch (error) {
    console.error('Error in GET /api/monthly-analytics:', error);
    return serverError();
  }
}

// POST /api/monthly-analytics - Upload monthly analytics
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized();
    }

    const token = authHeader.substring(7);
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !currentUser) {
      return unauthorized('Invalid token');
    }

    // Get user role and permissions
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role, assigned_clients')
      .eq('id', currentUser.id)
      .single();

    if (userError || !userData) {
      return unauthorized('User not found');
    }

    // Only IT_ADMIN and AGENCY_ADMIN can upload
    if (userData.role !== 'IT_ADMIN' && userData.role !== 'AGENCY_ADMIN') {
      return forbidden('Only IT Admin and Agency Admin can upload analytics');
    }

    const formData = await request.formData();
    const clientId = formData.get('clientId') as string;
    const monthStr = formData.get('month') as string; // Format: "YYYY-MM"
    const files = formData.getAll('files') as File[];

    if (!clientId || !monthStr || !files || files.length === 0) {
      return badRequest('Missing required fields: clientId, month, files');
    }

    // Validate client access for AGENCY_ADMIN
    if (userData.role === 'AGENCY_ADMIN') {
      const assignedClients = Array.isArray(userData.assigned_clients)
        ? userData.assigned_clients
        : (typeof userData.assigned_clients === 'string' ? [userData.assigned_clients] : []);
      
      if (!assignedClients.includes(clientId)) {
        return forbidden('You do not have access to this client');
      }
    }

    // Validate client exists
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, company_name')
      .eq('id', clientId)
      .is('deleted_at', null)
      .single();

    if (clientError || !client) {
      return badRequest('Client not found or deleted');
    }

    // Parse month (YYYY-MM) to first day of month (YYYY-MM-DD)
    const [year, month] = monthStr.split('-');
    const monthDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1).toISOString().split('T')[0];

    // Upload files to Supabase Storage
    logger.info('Starting file upload process', { filesCount: files.length, clientId, month: monthStr, component: 'MonthlyAnalytics API' });
    
    const attachments: Attachment[] = [];
    const uploadErrors: string[] = [];
    const uploadedPaths: string[] = []; // Track uploaded file paths for cleanup

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let uploadedPath: string | null = null;
      try {
        logger.debug(`Processing file ${i + 1}/${files.length}`, { fileName: file.name, sizeMB: (file.size / 1024 / 1024).toFixed(2), component: 'MonthlyAnalytics API' });
        
        const fileExt = file.name.split('.').pop() || 'bin';
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const timestamp = Date.now();
        const fileName = `${clientId}/${monthStr}/${timestamp}_${sanitizedFileName}`;
        // Note: filePath should NOT include the bucket name, just the path within the bucket
        const filePath = fileName;
        uploadedPath = filePath;

        logger.debug('Uploading to path', { filePath, component: 'MonthlyAnalytics API' });

        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        logger.debug('File converted to ArrayBuffer', { sizeMB: (arrayBuffer.byteLength / 1024 / 1024).toFixed(2), component: 'MonthlyAnalytics API' });
        
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('monthly-analytics')
          .upload(filePath, arrayBuffer, {
            contentType: file.type || 'application/octet-stream',
            upsert: false
          });

        if (uploadError) {
          console.error(`[MonthlyAnalytics API] Storage upload error for ${file.name}:`, uploadError);
          console.error(`[MonthlyAnalytics API] Upload error details:`, JSON.stringify(uploadError, null, 2));
          uploadErrors.push(`${file.name}: ${uploadError.message}`);
          uploadedPath = null; // Mark as not uploaded
          continue;
        }

        logger.info('File uploaded successfully', { fileName: file.name, component: 'MonthlyAnalytics API' });

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
          .from('monthly-analytics')
          .getPublicUrl(filePath);
        
        logger.debug('Public URL generated', { publicUrl: urlData.publicUrl, component: 'MonthlyAnalytics API' });

        attachments.push({
          filename: file.name,
          url: urlData.publicUrl,
          size: file.size,
          type: file.type || 'application/octet-stream'
        });
        
        uploadedPaths.push(filePath);
      } catch (fileError) {
        console.error('Error uploading file', file.name, ':', fileError);
        uploadErrors.push(`${file.name}: ${(fileError as Error).message}`);
        // Don't add to uploadedPaths if upload failed before completion
      }
    }

    if (attachments.length === 0) {
      return badRequest(`Failed to upload all files: ${uploadErrors.join('; ')}`);
    }

    // Warn if some files failed (but continue with successful uploads)
    if (uploadErrors.length > 0) {
      console.warn('Some files failed to upload:', uploadErrors);
      // Note: We continue with the successfully uploaded files
    }

    // Save to database
    logger.info('Saving record to database', { component: 'MonthlyAnalytics API' });
    logger.debug('Record data', {
      client_id: clientId,
      month: monthDate,
      uploaded_by: currentUser.id,
      attachments_count: attachments.length
    });
    
    const { data: record, error: dbError } = await supabaseAdmin
      .from('monthly_analytics')
      .insert([{
        client_id: clientId,
        month: monthDate,
        uploaded_by: currentUser.id,
        attachments: attachments
      }])
      .select(`
        id,
        client_id,
        month,
        uploaded_by,
        uploaded_at,
        attachments,
        clients:client_id (company_name),
        uploader:uploaded_by (email, first_name, last_name)
      `)
      .single();

    if (dbError) {
      console.error('[MonthlyAnalytics API] Database insert error:', dbError);
      console.error('[MonthlyAnalytics API] Database error details:', JSON.stringify(dbError, null, 2));
      // Clean up uploaded files
      if (uploadedPaths.length > 0) {
        logger.warn('Cleaning up uploaded files due to database error', { component: 'MonthlyAnalytics API' });
        await supabaseAdmin.storage.from('monthly-analytics').remove(uploadedPaths);
      }
      return serverError('Failed to save analytics record');
    }

    logger.info('Record saved successfully', { recordId: record?.id, component: 'MonthlyAnalytics API' });

    // If some files failed, include a warning in the response
    // The frontend can check for this and display a warning
    if (uploadErrors.length > 0) {
      console.warn(`Successfully uploaded ${attachments.length} file(s), but ${uploadErrors.length} file(s) failed:`, uploadErrors);
    }

    // Transform response
    const r = record as any;
    const clientsData = Array.isArray(r.clients) ? r.clients[0] : r.clients;
    const uploaderData = Array.isArray(r.uploader) ? r.uploader[0] : r.uploader;

    const response = {
      id: r.id,
      clientId: r.client_id,
      clientName: (clientsData as { company_name: string } | null | undefined)?.company_name || 'Unknown',
      month: r.month,
      uploadedBy: r.uploaded_by,
      uploadedByName: uploaderData 
        ? `${uploaderData.first_name || ''} ${uploaderData.last_name || ''}`.trim() || uploaderData.email || 'Unknown'
        : 'Unknown',
      uploadedAt: r.uploaded_at,
      attachments: r.attachments as Attachment[]
    };

    return created(response);
  } catch (error) {
    console.error('Error in POST /api/monthly-analytics:', error);
    return serverError();
  }
}

