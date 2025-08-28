## 2025-08-28 (AEST)
- Implemented WYSIWYG toolbar for Email RichTextEditor (TipTap):
  - Fixed top toolbar with dropdowns: Normal/H1/H2/H3/H4 and “Add” (Image, Table 3×3, Horizontal rule)
  - Formatting actions: Bold, Italic, Underline, Strike, Link/Unlink, Align (L/C/R/Justify), Superscript, Subscript, Code block (</>)
  - Lists: Bulleted and Numbered toggles working reliably
  - Undo/Redo buttons
- Interaction fixes:
  - Handlers use onMouseDown with preventDefault to avoid focus loss
  - Use setHeading/setParagraph and robust list toggles (exit codeBlock if needed)
- Styling:
  - Added .rte WYSIWYG styles in src/app/globals.css (headings, lists, code, pre, blockquote)
  - Editor element tagged with “rte” class
- Verified in dev at http://localhost:3000

Next ideas:
- Optional: switch </> to inline code instead of codeBlock
- Icon-only toolbar, keyboard shortcuts hints
- Sanitize HTML on send and server-side schema validation