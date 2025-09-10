# Development Scripts

This directory contains utility scripts for development and maintenance of the Task Tracking application.

## Available Scripts

### `convert-to-typescript.js`

This script helps convert JavaScript files (`.js`, `.jsx`) to TypeScript (`.ts`, `.tsx`) to maintain the project's standardization rules.

#### Usage

```bash
node scripts/convert-to-typescript.js
```

#### What it does

1. Scans the `src` directory for `.js` and `.jsx` files
2. Converts each file to its TypeScript equivalent (`.ts` or `.tsx`)
3. Adds basic TypeScript annotations
4. Adds React imports for JSX files if missing
5. Adds "use client" directive for component files if needed
6. Updates imports in other files to reference the new TypeScript files

#### Notes

- Always review the converted files for any TypeScript errors or missing type definitions
- Run the TypeScript compiler (`tsc --noEmit`) after conversion to check for type errors
- Some files may require manual adjustments for proper TypeScript typing