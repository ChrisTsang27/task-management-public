# API Standardization Guidelines

This document outlines the standardized patterns and utilities for building consistent, maintainable API endpoints in the task tracking application.

## Overview

We have implemented a set of utility functions and validation schemas to ensure consistency across all API endpoints. These utilities handle common patterns like authentication, validation, error handling, and response formatting.

## Core Utilities

### Location
- **Utilities**: `src/lib/api/utils.ts`
- **Schemas**: `src/lib/api/schemas.ts`

### Key Functions

#### Authentication
```typescript
import { authenticateRequest } from '@/lib/api/utils';

// Standard authentication pattern
const authResult = await authenticateRequest(request);
if (!authResult.success) {
  return authResult.error;
}
const { user, supabase } = authResult;
```

#### Request Validation
```typescript
import { validateRequestBody } from '@/lib/api/utils';
import { CreateTaskSchema } from '@/lib/api/schemas';

const validation = validateRequestBody(body, CreateTaskSchema);
if (!validation.success) {
  return validation.error;
}
const validatedData = validation.data;
```

#### Error Handling
```typescript
import { withErrorHandling, handleDatabaseError } from '@/lib/api/utils';

// Wrap your handler
export const GET = withErrorHandling(async (request: NextRequest) => {
  // Your logic here
});

// Handle database errors
if (error) {
  return handleDatabaseError(error, 'fetch tasks');
}
```

#### Response Formatting
```typescript
import { createSuccessResponse, createErrorResponse, createPaginatedResponse } from '@/lib/api/utils';

// Success response
return createSuccessResponse({ data }, 200);

// Error response
return createErrorResponse('Invalid data', 400);

// Paginated response
const response = createPaginatedResponse(data, total, page, limit);
return createSuccessResponse(response);
```

## Standard Patterns

### 1. Route Handler Structure

```typescript
import { NextRequest } from 'next/server';
import {
  authenticateRequest,
  validateRequestBody,
  withErrorHandling,
  createSuccessResponse,
  handleDatabaseError
} from '@/lib/api/utils';
import { YourSchema } from '@/lib/api/schemas';

export const GET = withErrorHandling(async (request: NextRequest) => {
  // 1. Authenticate
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return authResult.error;
  }
  const { user, supabase } = authResult;

  // 2. Parse and validate parameters
  const { searchParams } = new URL(request.url);
  const pagination = parsePaginationParams(searchParams);
  
  // 3. Build and execute query
  const { data, error } = await supabase
    .from('table')
    .select(STANDARD_SELECTS.entity)
    // ... query logic

  // 4. Handle errors
  if (error) {
    return handleDatabaseError(error, 'operation description');
  }

  // 5. Return formatted response
  return createSuccessResponse({ data });
});
```

### 2. POST Handler Pattern

```typescript
export const POST = withErrorHandling(async (request: NextRequest) => {
  // 1. Authenticate
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return authResult.error;
  }
  const { user, supabase } = authResult;

  // 2. Parse and validate body
  const body = await request.json();
  const validation = validateRequestBody(body, CreateEntitySchema);
  if (!validation.success) {
    return validation.error;
  }

  // 3. Process data
  const entityData = {
    ...validation.data,
    created_by: user.id
  };

  // 4. Database operation
  const { data, error } = await supabase
    .from('table')
    .insert([entityData])
    .select(STANDARD_SELECTS.entity)
    .single();

  // 5. Handle errors and return
  if (error) {
    return handleDatabaseError(error, 'create entity');
  }

  return createSuccessResponse({ entity: data }, 201);
});
```

## Validation Schemas

### Available Schemas

- **Tasks**: `CreateTaskSchema`, `UpdateTaskSchema`, `TaskFiltersSchema`
- **Announcements**: `CreateAnnouncementSchema`, `UpdateAnnouncementSchema`
- **Teams**: `CreateTeamSchema`, `UpdateTeamSchema`, `TeamMemberSchema`
- **Users**: `UpdateProfileSchema`
- **Comments**: `CreateCommentSchema`, `UpdateCommentSchema`
- **Common**: `IdSchema`, `PaginationSchema`

### Custom Schema Example

```typescript
import { z } from 'zod';

export const CustomEntitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active')
});
```

## Database Patterns

### Standard Select Queries

Use predefined select patterns from `STANDARD_SELECTS`:

```typescript
// Instead of writing custom selects
const { data } = await supabase
  .from('tasks')
  .select(STANDARD_SELECTS.task); // Includes related data
```

### Error Handling

The `handleDatabaseError` function automatically maps PostgreSQL error codes to appropriate HTTP responses:

- `PGRST116` → 404 Not Found
- `23505` → 409 Conflict (Unique violation)
- `23503` → 400 Bad Request (Foreign key violation)
- `23514` → 400 Bad Request (Check violation)
- Default → 500 Internal Server Error

## Pagination

### Standard Pagination

```typescript
const pagination = parsePaginationParams(searchParams);
// Returns: { page, limit, offset, range: { from, to } }

// Apply to query
query = query.range(pagination.range.from, pagination.range.to);

// Format response
const response = createPaginatedResponse(data, total, pagination.page, pagination.limit);
```

### Query Parameters

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

## Response Formats

### Success Response
```json
{
  "data": [...],
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": "Optional error details"
}
```

### Paginated Response
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20,
  "hasMore": true
}
```

## Migration Guide

### Converting Existing Endpoints

1. **Update imports**:
   ```typescript
   import {
     authenticateRequest,
     withErrorHandling,
     // ... other utilities
   } from '@/lib/api/utils';
   ```

2. **Replace authentication logic**:
   ```typescript
   // Old
   const authHeader = request.headers.get('authorization');
   // ... manual auth logic
   
   // New
   const authResult = await authenticateRequest(request);
   if (!authResult.success) return authResult.error;
   ```

3. **Add validation**:
   ```typescript
   const validation = validateRequestBody(body, YourSchema);
   if (!validation.success) return validation.error;
   ```

4. **Wrap with error handling**:
   ```typescript
   export const GET = withErrorHandling(async (request) => {
     // Your logic
   });
   ```

5. **Use standard responses**:
   ```typescript
   // Old
   return NextResponse.json({ data }, { status: 200 });
   
   // New
   return createSuccessResponse({ data });
   ```

## Best Practices

1. **Always use authentication** for protected endpoints
2. **Validate all input data** using Zod schemas
3. **Use standard error handling** for consistent error responses
4. **Implement pagination** for list endpoints
5. **Use standard select patterns** for consistent data structure
6. **Handle database errors** appropriately
7. **Return consistent response formats**

## Testing

When testing API endpoints:

1. Test authentication (valid/invalid tokens)
2. Test validation (valid/invalid data)
3. Test error scenarios (database errors, not found, etc.)
4. Test pagination (different page sizes, edge cases)
5. Test filtering and sorting

## Examples

See the updated `src/app/api/tasks/route.ts` for a complete example of the standardized patterns in action.