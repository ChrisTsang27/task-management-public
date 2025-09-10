# File Standardization Guide

## File Extension Standards

### TypeScript and React

This project strictly uses TypeScript for all code files. The following file extension standards must be followed:

- **`.tsx`**: Use for all React component files
  - Pages
  - UI components
  - Layout components
  - Higher-order components

- **`.ts`**: Use for all non-React TypeScript files
  - Utility functions
  - Hooks
  - Services
  - API handlers
  - Type definitions
  - Configuration files

- **`.d.ts`**: Use for TypeScript declaration files only

**Important**: Do not use `.jsx` or `.js` extensions for new files. All JavaScript code should be written in TypeScript.

## File Naming Conventions

### Component Files

- Use **PascalCase** for all component files
  - Example: `TaskCard.tsx`, `UserProfile.tsx`, `EmailComposer.tsx`

- Shadcn UI components use **kebab-case**
  - Example: `button.tsx`, `dialog.tsx`, `card.tsx`

### Non-Component Files

- Use **camelCase** for utility, service, and hook files
  - Example: `useSupabaseProfile.ts`, `emailService.ts`, `utils.ts`

- Hooks must start with `use` prefix
  - Example: `useRoleAccess.ts`, `useLoadingState.ts`

### Special Files

- Next.js special files follow Next.js conventions
  - `page.tsx` for page components
  - `layout.tsx` for layout components
  - `loading.tsx` for loading states
  - `error.tsx` for error states
  - `not-found.tsx` for 404 pages

## File Organization

### Component Structure

Each component file should follow this structure:

1. Imports (grouped and ordered)
   - React and Next.js imports
   - Third-party library imports
   - Internal component imports
   - Utility and hook imports
   - Type imports

2. Type definitions
   - Interfaces
   - Types
   - Enums

3. Component definition
   - Start with "use client" directive if client component
   - Export default for main components
   - Named exports for utility components

4. Helper functions (if needed)

### Example Component Structure

```tsx
"use client";

import React, { useState, useEffect } from "react";
// Third-party imports
import { useForm } from "react-hook-form";
// Internal components
import { Button } from "@/components/ui/button";
// Utilities and hooks
import { useSupabaseProfile } from "@/hooks/useSupabaseProfile";
// Types
import type { Task } from "@/types/tasks";

interface TaskFormProps {
  initialData?: Task;
  onSubmit: (data: Task) => void;
}

export default function TaskForm({ initialData, onSubmit }: TaskFormProps) {
  // Component implementation
}
```

## Migration Plan

For existing files that don't follow these standards:

1. Identify all `.js` and `.jsx` files in the codebase
2. Convert them to `.ts` or `.tsx` as appropriate
3. Add proper type definitions
4. Update imports in other files

## Linting and Enforcement

ESLint rules should be configured to enforce these standards:

- Require TypeScript for all files
- Enforce naming conventions
- Ensure proper file organization

## Conclusion

Following these file standardization guidelines ensures consistency across the codebase and makes it easier for developers to navigate and maintain the project. All new files must adhere to these standards, and existing files should be gradually migrated to comply with them.