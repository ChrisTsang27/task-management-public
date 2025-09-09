import { NextResponse } from "next/server";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";
import emailService from "@/lib/emailService";

const EmailPayload = z.object({
  title: z.string().max(120).optional().default(""),
  subject: z.string().min(1, "Subject is required").max(200),
  content: z.string().min(1, "Content required").max(1000000),
  recipients: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
      })
    )
    .min(1, "At least one recipient")
    .max(100, "Too many recipients"),
  timestamp: z.string().optional(),
});

function sanitize(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      "div",
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "a",
      "blockquote",
      "code",
      "pre",
      "hr",
      "img",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
      "sup",
      "sub",
      "br",
      "span",
      "small",
      "center"
    ],
    allowedAttributes: {
      '*': ['style', 'class', 'id'],
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
      div: ["style", "class"],
      p: ["style", "class"],
      span: ["style", "class"],
      table: ["style", "class", "width", "cellpadding", "cellspacing", "border"]
    },
    allowedSchemes: ["http", "https", "mailto", "data"],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }, true),
    },
    // Allow all CSS properties for email templates
    allowedStyles: {
      '*': {
        // Allow all common CSS properties used in email templates
        'background': [/.*/],
        'background-color': [/.*/],
        'background-image': [/.*/],
        'background-position': [/.*/],
        'background-repeat': [/.*/],
        'background-size': [/.*/],
        'border': [/.*/],
        'border-radius': [/.*/],
        'border-color': [/.*/],
        'border-style': [/.*/],
        'border-width': [/.*/],
        'box-shadow': [/.*/],
        'color': [/.*/],
        'display': [/.*/],
        'font-family': [/.*/],
        'font-size': [/.*/],
        'font-weight': [/.*/],
        'font-style': [/.*/],
        'height': [/.*/],
        'line-height': [/.*/],
        'margin': [/.*/],
        'margin-top': [/.*/],
        'margin-bottom': [/.*/],
        'margin-left': [/.*/],
        'margin-right': [/.*/],
        'max-width': [/.*/],
        'min-height': [/.*/],
        'opacity': [/.*/],
        'overflow': [/.*/],
        'padding': [/.*/],
        'padding-top': [/.*/],
        'padding-bottom': [/.*/],
        'padding-left': [/.*/],
        'padding-right': [/.*/],
        'text-align': [/.*/],
        'text-decoration': [/.*/],
        'vertical-align': [/.*/],
        'width': [/.*/]
      }
    },
    // strip all disallowed
    disallowedTagsMode: "discard",
  });
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = EmailPayload.safeParse(json);
    if (!parsed.success) {
      console.error("Email validation failed:", parsed.error.flatten());
      return NextResponse.json({ message: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
    }

    const { subject, content, recipients, timestamp } = parsed.data;

    // Debug: Log the original content
    console.log('Original content received:', content.substring(0, 500) + '...');
    
    // Sanitize the content
    const sanitizedContent = sanitize(content);
    
    // Debug: Log the sanitized content
    console.log('Sanitized content:', sanitizedContent.substring(0, 500) + '...');
    
    if (!sanitizedContent || sanitizedContent.trim().length === 0) {
      return NextResponse.json({ message: "Content is empty after sanitization" }, { status: 400 });
    }

    // Use our EmailService to send emails
    try {
      // Prepare recipient emails
      const recipientEmails = recipients.map(r => r.email);
      
      // Add timestamp to content if provided
      const finalContent = timestamp ? `${sanitizedContent}<br><br><small><em>Sent: ${timestamp}</em></small>` : sanitizedContent;
      
      // Ensure proper HTML document structure
      const htmlContent = finalContent.includes('<!DOCTYPE') ? finalContent : `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body>
${finalContent}
</body>
</html>`;

      // Debug: Log the final HTML content
      console.log('Final HTML content:', htmlContent.substring(0, 500) + '...');

      // Generate plain text version from HTML for better email client compatibility
      const textContent = finalContent
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
      
      // Send email using our EmailService
      const result = await emailService.sendEmail({
        to: recipientEmails,
        subject: subject,
        html: htmlContent,
        text: textContent
      });
      
      if (result.success) {
        return NextResponse.json(
          {
            message: "Email sent successfully",
            messageId: result.messageId,
            recipientsCount: recipients.length
          },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          {
            message: "Failed to send email",
            error: result.error
          },
          { status: 500 }
        );
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return NextResponse.json(
        {
          message: "Email service error",
          error: emailError instanceof Error ? emailError.message : "Unknown error"
        },
        { status: 500 }
      );
    }
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}