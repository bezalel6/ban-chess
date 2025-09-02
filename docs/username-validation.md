# Username Validation System

## Overview
The username system provides secure, validated username changes with multiple layers of protection.

## Validation Rules

### Character Requirements
- **Length**: 3-20 characters
- **Allowed characters**: Letters (a-z, A-Z), numbers (0-9), underscores (_), and hyphens (-)
- **Pattern**: `/^[a-zA-Z0-9_-]+$/`

### Restricted Terms (Automatically Blocked)
The system blocks usernames containing:

1. **System/Admin Terms**:
   - admin, administrator, moderator, mod
   - staff, system, root, superuser
   - owner, operator, official
   - support, help, service

2. **Platform Impersonation**:
   - lichess, chesscom, chess.com
   - Prevents users from impersonating official accounts

3. **Reserved Prefixes**:
   - `guest_` - Reserved for guest accounts
   - `system_` - Reserved for system use
   - `bot_` - Reserved for bots
   - `ai_` - Reserved for AI players

4. **Profanity Filter**:
   - Uses the `bad-words` npm package
   - Checks for leetspeak variations (1→i, 3→e, 4→a, 5→s, 0→o, 7→t)
   - Blocks consecutive special characters (e.g., `___`, `---`)

### Rate Limiting
- Users can only change their username once every 7 days
- Previous usernames are reserved for 30 days to prevent rapid switching
- Guest accounts cannot change usernames

## API Endpoints

### Check Username Availability
```
GET /api/user/username?username={username}
```

Response:
```json
{
  "available": true/false,
  "error": "Error message if not available"
}
```

### Change Username
```
POST /api/user/username
Body: { "newUsername": "DesiredUsername" }
```

Response:
```json
{
  "success": true,
  "newUsername": "DesiredUsername",
  "message": "Username updated successfully. Please sign out and back in for changes to take effect.",
  "requiresReauth": true
}
```

## Security Features

1. **Vague Error Messages**: The system returns generic "This username is not available" messages to prevent enumeration of blocked terms

2. **Case-Insensitive Checks**: All validation is performed on lowercase versions to prevent bypasses

3. **Real-time Validation**: Client-side checks provide immediate feedback with 500ms debouncing

4. **Server-side Enforcement**: All validation is enforced server-side regardless of client checks

5. **Session Updates**: Username changes are propagated through Redis pub/sub to update all active sessions

## Implementation Files

- `/lib/username.ts` - Core validation logic
- `/app/api/user/username/route.ts` - API endpoints
- `/components/UsernameChangeModal.tsx` - UI component
- `/app/user/[username]/ProfilePageClient.tsx` - Profile page integration