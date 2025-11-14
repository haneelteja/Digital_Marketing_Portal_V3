# Future Enhancements Implementation Guide

This document outlines the architecture and implementation approach for the three major future enhancements:

1. **Third-Party Integration** - Post approved content to external platforms
2. **AI Calendar Generation** - Generate content calendars using AI
3. **Enhanced Notifications Management** - Advanced notification system for IT Admin

---

## Architecture Overview

### Service Layer Pattern

All enhancements follow a **Service Layer Pattern** for clean separation of concerns:

```
┌─────────────────────────────────────┐
│   API Routes (Next.js)              │
│   - /api/integrations/*             │
│   - /api/ai/calendar/*             │
│   - /api/notifications/manage/*    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Service Layer                     │
│   - IntegrationManager             │
│   - CalendarGenerationService      │
│   - NotificationManagementService  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Database (Supabase)                │
│   - integration_configs             │
│   - ai_calendar_generations         │
│   - notification_templates          │
└─────────────────────────────────────┘
```

---

## 1. Third-Party Integration System

### Architecture

**Base Service Pattern:**
- `BaseIntegrationService` - Abstract base class
- Provider-specific implementations (Facebook, Instagram, Twitter, LinkedIn)
- `IntegrationManager` - Singleton manager for all integrations

### Key Files

```
src/services/integrations/
├── BaseIntegrationService.ts          # Abstract base class
├── IntegrationManager.ts               # Manager singleton
└── providers/
    ├── FacebookIntegrationService.ts  # Facebook implementation
    ├── InstagramIntegrationService.ts # Instagram implementation
    ├── TwitterIntegrationService.ts   # Twitter implementation
    └── LinkedInIntegrationService.ts  # LinkedIn implementation
```

### Database Schema

```sql
-- Integration configurations
integration_configs
  - id, name, type, enabled
  - credentials (JSONB) - API keys, tokens
  - settings (JSONB) - Platform-specific settings

-- Integration post history
integration_posts
  - integration_id, post_id, external_id
  - status, posted_at, error_message
```

### Implementation Steps

1. **Set up database schema** (already created)
   ```bash
   # Run in Supabase SQL Editor
   # File: database_schemas/future_enhancements_schema.sql
   ```

2. **Configure integration** (IT Admin only)
   ```typescript
   // POST /api/integrations
   {
     name: "Facebook Page",
     type: "FACEBOOK",
     credentials: {
       accessToken: "...",
       pageId: "..."
     },
     enabled: true
   }
   ```

3. **Post approved content**
   ```typescript
   // POST /api/integrations/post
   {
     postId: "uuid",
     platform: "FACEBOOK"
   }
   ```

### Adding New Integration Provider

1. Create new service class extending `BaseIntegrationService`
2. Implement required methods:
   - `initialize()`
   - `postContent()`
   - `verifyConnection()`
   - `getStatus()`
3. Register in `IntegrationManager.createIntegrationService()`

**Example:**
```typescript
// src/services/integrations/providers/NewPlatformService.ts
export class NewPlatformService extends BaseIntegrationService {
  async postContent(postData: PostData): Promise<IntegrationResult> {
    // Implement API call to new platform
  }
}
```

---

## 2. AI Calendar Generation System

### Architecture

**Service Pattern:**
- `CalendarGenerationService` - Main service
- Supports multiple AI providers (OpenAI, Anthropic, Custom)
- Generates calendar entries for single or all clients

### Key Files

```
src/services/ai/
└── CalendarGenerationService.ts       # AI calendar generation
```

### Database Schema

```sql
ai_calendar_generations
  - id, client_id, generated_by
  - start_date, end_date, frequency
  - status, entries_generated, entries_saved
  - request_metadata, result_metadata
```

### Implementation Steps

1. **Set up AI provider credentials**
   ```env
   AI_PROVIDER=openai
   AI_API_KEY=sk-...
   ```

2. **Generate calendar**
   ```typescript
   // POST /api/ai/calendar/generate
   {
     clientId: "uuid", // Optional - null for all clients
     startDate: "2025-01-01",
     endDate: "2025-01-31",
     frequency: "weekly",
     themes: ["marketing", "promotions"],
     aiProvider: "openai"
   }
   ```

3. **Generated entries are automatically saved to `calendar_entries`**

### AI Provider Integration

**Current:** Placeholder implementation
**To Implement:**
1. Choose AI provider (OpenAI, Anthropic, etc.)
2. Update `callAI()` method in `CalendarGenerationService`
3. Parse AI response into calendar entries
4. Handle errors and rate limiting

**Example OpenAI Integration:**
```typescript
private async callAI(prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a content calendar generator.' },
        { role: 'user', content: prompt },
      ],
    }),
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}
```

---

## 3. Enhanced Notifications Management

### Architecture

**Management Service Pattern:**
- `NotificationManagementService` - IT Admin management
- Templates, Rules, Preferences, Statistics

### Key Files

```
src/services/notifications/
└── NotificationManagementService.ts    # Notification management
```

### Database Schema

```sql
notification_templates
  - id, name, type, title, body
  - variables[], enabled

notification_rules
  - id, name, event_type
  - conditions (JSONB), template_id
  - recipients, custom_recipients[]

notification_preferences
  - user_id, email_enabled
  - push_enabled, sms_enabled
  - types (JSONB)
```

### Implementation Steps

1. **Create notification template** (IT Admin)
   ```typescript
   // POST /api/notifications/manage
   {
     action: "template",
     data: {
       name: "Post Approved",
       type: "APPROVAL",
       title: "Post Approved",
       body: "Your post for {{clientName}} has been approved.",
       variables: ["clientName"],
       enabled: true
     }
   }
   ```

2. **Create notification rule**
   ```typescript
   {
     action: "rule",
     data: {
       name: "Auto-notify on Approval",
       eventType: "APPROVAL",
       templateId: "uuid",
       recipients: "client",
       enabled: true
     }
   }
   ```

3. **View statistics**
   ```typescript
   // GET /api/notifications/manage?type=stats
   // Returns: total, unread, byType, byClient, recentActivity
   ```

---

## Integration with Existing Approval Workflow

### Automatic Posting on Approval

**Hook into existing approval endpoints:**

```typescript
// In src/app/api/upload/approve/[uploadId]/route.ts
// After approval is successful:

if (approved === true) {
  // Check if auto-posting is enabled
  const { data: autoPostSettings } = await supabaseAdmin
    .from('integration_configs')
    .select('id, settings')
    .eq('enabled', true)
    .contains('settings', { autoPostOnApproval: true });

  if (autoPostSettings && autoPostSettings.length > 0) {
    // Post to integrations
    await fetch('/api/integrations/post', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postId: uploadRecord.entry_id,
        platform: uploadRecord.platform || 'FACEBOOK',
      }),
    });
  }
}
```

---

## UI Components (To Be Created)

### 1. Integration Management UI

**Location:** `src/components/Integrations/IntegrationManagementTab.tsx`

**Features:**
- List all integrations
- Add/edit integration
- Test connection
- View posting history
- Enable/disable integrations

### 2. AI Calendar Generation UI

**Location:** `src/components/AICalendar/AICalendarGenerator.tsx`

**Features:**
- Select client(s)
- Set date range
- Configure generation options
- View generation history
- Review and approve generated entries

### 3. Notification Management UI

**Location:** `src/components/Notifications/NotificationManagementTab.tsx`

**Features:**
- View notification statistics
- Create/edit templates
- Create/edit rules
- Manage user preferences
- Bulk notification sending

---

## Environment Variables

Add to `.env.local`:

```env
# AI Configuration
AI_PROVIDER=openai
AI_API_KEY=sk-...

# Integration Webhooks (optional)
INTEGRATION_WEBHOOK_SECRET=...

# Notification Settings
NOTIFICATION_EMAIL_ENABLED=true
NOTIFICATION_PUSH_ENABLED=true
```

---

## Testing Strategy

### Unit Tests

```typescript
// Example: Test integration service
describe('FacebookIntegrationService', () => {
  it('should post content successfully', async () => {
    const service = new FacebookIntegrationService(mockConfig);
    const result = await service.postContent(mockPostData);
    expect(result.success).toBe(true);
  });
});
```

### Integration Tests

- Test API endpoints
- Test database operations
- Test service interactions

### Manual Testing

1. **Third-Party Integration:**
   - Configure Facebook integration
   - Approve a post
   - Verify posting to Facebook

2. **AI Calendar Generation:**
   - Generate calendar for a client
   - Verify entries created
   - Review generated content

3. **Notification Management:**
   - Create template
   - Create rule
   - Trigger notification
   - Verify delivery

---

## Security Considerations

1. **Credentials Storage:**
   - Store in encrypted JSONB field
   - Use Supabase Vault for sensitive data
   - Rotate credentials regularly

2. **API Keys:**
   - Never expose in client-side code
   - Use environment variables
   - Implement rate limiting

3. **Access Control:**
   - IT Admin only for management
   - Role-based access for features
   - Audit logging

---

## Next Steps

1. **Run database migration:**
   ```bash
   # Execute database_schemas/future_enhancements_schema.sql in Supabase
   ```

2. **Implement actual AI provider:**
   - Choose provider (OpenAI recommended)
   - Update `CalendarGenerationService.callAI()`
   - Test generation quality

3. **Implement actual integration providers:**
   - Start with one platform (e.g., Facebook)
   - Implement full API integration
   - Test end-to-end flow

4. **Create UI components:**
   - Integration management tab
   - AI calendar generator
   - Notification management tab

5. **Add to dashboard navigation:**
   - Add "Integrations" tab (IT Admin only)
   - Add "AI Calendar" tab (IT Admin, Agency Admin)
   - Enhance "Notifications" tab

---

## Support and Documentation

- **Service Documentation:** See inline comments in service files
- **API Documentation:** See API route files
- **Database Schema:** See `database_schemas/future_enhancements_schema.sql`

---

**Ready to implement!** 🚀

The architecture is in place. You can now:
1. Run the database migration
2. Start implementing specific providers
3. Build UI components
4. Test end-to-end workflows




