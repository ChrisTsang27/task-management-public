import { NextResponse } from "next/server";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";
import emailService from "@/lib/emailService";

const EmailPayload = z.object({
  title: z.string().max(120).optional().default(""),
  subject: z.string().min(1, "Subject is required").max(200),
  content: z.string().min(1, "Content required").max(10000),
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
      '*': ['style', 'class'],
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
      div: ["style", "class"],
      p: ["style", "class"],
      span: ["style", "class"],
      table: ["style", "class", "width", "cellpadding", "cellspacing", "border"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }, true),
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
      return NextResponse.json({ message: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
    }

    const { subject, content, recipients, timestamp } = parsed.data;

    // sanitize content
    const clean = sanitize(content);
    if (!clean || clean.trim().length === 0) {
      return NextResponse.json({ message: "Content is empty after sanitization" }, { status: 400 });
    }

    // Use our EmailService to send emails
    try {
      // Prepare recipient emails
      const recipientEmails = recipients.map(r => r.email);
      
      // Add timestamp to content if provided
      const finalContent = timestamp ? `${clean}<br><br><small><em>Sent: ${timestamp}</em></small>` : clean;
      
      // Send email using our EmailService
      const result = await emailService.sendEmail({
        to: recipientEmails,
        subject: subject,
        html: finalContent
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