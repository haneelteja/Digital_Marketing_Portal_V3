/**
 * Notification Management Service for IT Admin
 * 
 * Enhanced notification system with management capabilities for IT admins
 */

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { logger } from '../../utils/logger';

export interface NotificationTemplate {
  id?: string;
  name: string;
  type: string;
  title: string;
  body: string;
  variables?: string[]; // Variables that can be replaced in template
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationRule {
  id?: string;
  name: string;
  eventType: string; // POST_ADDED, APPROVAL, etc.
  conditions?: Record<string, any>; // Conditions for triggering
  templateId: string;
  recipients: 'all' | 'client' | 'admin' | 'custom';
  customRecipients?: string[]; // User IDs for custom recipients
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  byClient: Record<string, number>;
  recentActivity: Array<{
    date: string;
    count: number;
  }>;
}

export interface NotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  types: Record<string, boolean>; // Notification type preferences
}

export class NotificationManagementService {
  /**
   * Create a notification template
   */
  async createTemplate(template: NotificationTemplate): Promise<NotificationTemplate> {
    try {
      const { data, error } = await supabaseAdmin
        .from('notification_templates')
        .insert({
          name: template.name,
          type: template.type,
          title: template.title,
          body: template.body,
          variables: template.variables || [],
          enabled: template.enabled,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating notification template', error);
        throw error;
      }

      logger.info('Notification template created', { templateId: data.id });
      return data as NotificationTemplate;
    } catch (error) {
      logger.error('Error in createTemplate', error);
      throw error;
    }
  }

  /**
   * Update a notification template
   */
  async updateTemplate(templateId: string, updates: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    try {
      const { data, error } = await supabaseAdmin
        .from('notification_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating notification template', error);
        throw error;
      }

      return data as NotificationTemplate;
    } catch (error) {
      logger.error('Error in updateTemplate', error);
      throw error;
    }
  }

  /**
   * Get all notification templates
   */
  async getTemplates(): Promise<NotificationTemplate[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('notification_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching notification templates', error);
        throw error;
      }

      return (data || []) as NotificationTemplate[];
    } catch (error) {
      logger.error('Error in getTemplates', error);
      throw error;
    }
  }

  /**
   * Create a notification rule
   */
  async createRule(rule: NotificationRule): Promise<NotificationRule> {
    try {
      const { data, error } = await supabaseAdmin
        .from('notification_rules')
        .insert({
          name: rule.name,
          event_type: rule.eventType,
          conditions: rule.conditions || {},
          template_id: rule.templateId,
          recipients: rule.recipients,
          custom_recipients: rule.customRecipients || [],
          enabled: rule.enabled,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating notification rule', error);
        throw error;
      }

      logger.info('Notification rule created', { ruleId: data.id });
      return data as NotificationRule;
    } catch (error) {
      logger.error('Error in createRule', error);
      throw error;
    }
  }

  /**
   * Get all notification rules
   */
  async getRules(): Promise<NotificationRule[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('notification_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching notification rules', error);
        throw error;
      }

      return (data || []) as NotificationRule[];
    } catch (error) {
      logger.error('Error in getRules', error);
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  async getStats(startDate?: string, endDate?: string): Promise<NotificationStats> {
    try {
      let query = supabaseAdmin.from('notifications').select('type, client_id, is_read, created_at');

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching notification stats', error);
        throw error;
      }

      const notifications = data || [];

      // Calculate statistics
      const stats: NotificationStats = {
        total: notifications.length,
        unread: notifications.filter((n) => !n.is_read).length,
        byType: {},
        byClient: {},
        recentActivity: [],
      };

      // Count by type
      notifications.forEach((n) => {
        stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
        if (n.client_id) {
          stats.byClient[n.client_id] = (stats.byClient[n.client_id] || 0) + 1;
        }
      });

      // Recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recent = notifications.filter((n) => new Date(n.created_at) >= sevenDaysAgo);
      const activityByDate: Record<string, number> = {};

      recent.forEach((n) => {
        const date = new Date(n.created_at).toISOString().split('T')[0];
        activityByDate[date] = (activityByDate[date] || 0) + 1;
      });

      stats.recentActivity = Object.entries(activityByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return stats;
    } catch (error) {
      logger.error('Error in getStats', error);
      throw error;
    }
  }

  /**
   * Bulk send notifications
   */
  async bulkSend(
    userIds: string[],
    title: string,
    body: string,
    type: string = 'SYSTEM',
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; sent: number; failed: number }> {
    try {
      const notifications = userIds.map((userId) => ({
        user_id: userId,
        type,
        title,
        body,
        is_read: false,
        metadata: metadata || {},
      }));

      const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert(notifications)
        .select();

      if (error) {
        logger.error('Error bulk sending notifications', error);
        throw error;
      }

      logger.info('Bulk notifications sent', { count: data?.length || 0 });
      return {
        success: true,
        sent: data?.length || 0,
        failed: userIds.length - (data?.length || 0),
      };
    } catch (error) {
      logger.error('Error in bulkSend', error);
      return {
        success: false,
        sent: 0,
        failed: userIds.length,
      };
    }
  }

  /**
   * Get user notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No preferences found, return defaults
          return {
            userId,
            emailEnabled: true,
            pushEnabled: true,
            smsEnabled: false,
            types: {},
          };
        }
        logger.error('Error fetching notification preferences', error);
        throw error;
      }

      return data as NotificationPreferences;
    } catch (error) {
      logger.error('Error in getPreferences', error);
      return null;
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    try {
      const { data, error } = await supabaseAdmin
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        logger.error('Error updating notification preferences', error);
        throw error;
      }

      return data as NotificationPreferences;
    } catch (error) {
      logger.error('Error in updatePreferences', error);
      throw error;
    }
  }

  /**
   * Delete old notifications (cleanup)
   */
  async cleanupOldNotifications(daysOld: number = 90): Promise<{ deleted: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data, error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select();

      if (error) {
        logger.error('Error cleaning up old notifications', error);
        throw error;
      }

      const deleted = data?.length || 0;
      logger.info('Old notifications cleaned up', { deleted, daysOld });
      return { deleted };
    } catch (error) {
      logger.error('Error in cleanupOldNotifications', error);
      throw error;
    }
  }
}

// Singleton instance
export const notificationManagementService = new NotificationManagementService();




