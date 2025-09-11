import { NextRequest, NextResponse } from "next/server";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";
import emailService from "@/lib/emailService";
import { authenticateRequest, createErrorResponse, createSuccessResponse } from '@/lib/api/utils';
import { rateLimiters } from '@/lib/middleware/rateLimiter';

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

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = rateLimiters.general(req);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Authenticate user (only authenticated users should send emails)
    const authResult = await authenticateRequest(req);
    if (!authResult.success) {
      return authResult.error!;
    }
    const { user, supabase } = authResult;

    // Ensure user and supabase are defined
    if (!user || !supabase) {
      return createErrorResponse('Authentication failed', 401);
    }

    // Check if user has permission to send emails (admin or manager)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'manager'].includes(profile.role)) {
      return createErrorResponse('Insufficient permissions to send emails', 403);
    }

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
      
      // Ensure proper HTML document structure with email-optimized formatting
      const htmlContent = finalContent.includes('<!DOCTYPE') ? finalContent : `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="format-detection" content="telephone=no" />
  <meta name="format-detection" content="date=no" />
  <meta name="format-detection" content="address=no" />
  <meta name="format-detection" content="email=no" />
  <title>${subject}</title>
  <style type="text/css">
    /* Email client compatibility styles */
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    p { margin: 0; }
  </style>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 20px;">
${finalContent}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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