import { NextResponse } from "next/server";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";

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
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "ul",
      "ol",
      "li",
      "strong",
      "em",
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
      "span"
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
      // keep span without style to avoid CSS injection; extend cautiously if needed
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

    const { title, subject, content, recipients, timestamp } = parsed.data;

    // sanitize content
    const clean = sanitize(content);
    if (!clean || clean.trim().length === 0) {
      return NextResponse.json({ message: "Content is empty after sanitization" }, { status: 400 });
    }

    const env = {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.EMAIL_FROM,
    };

    // If SMTP placeholders still present, simulate send
    const missing =
      !env.host || !env.port || !env.user || !env.pass || !env.from || String(env.host).includes("PLACEHOLDER");
    if (missing) {
      return NextResponse.json(
        {
          message:
            "SMTP not configured. Simulated send only. Please set SMTP_* and EMAIL_FROM in .env.local.",
          payload: {
            title,
            subject,
            contentLength: clean.length,
            recipientsCount: recipients.length,
            timestamp,
          },
        },
        { status: 202 }
      );
    }

    // Actual send via nodemailer (enable after credentials provided)
    // const nodemailer = await import("nodemailer");
    // const transporter = nodemailer.createTransport({
    //   host: env.host,
    //   port: Number(env.port),
    //   secure: Number(env.port) === 465,
    //   auth: { user: env.user, pass: env.pass },
    // });
    // const toList = recipients.map((r) => `${r.name} <${r.email}>`).join(", ");
    // await transporter.sendMail({
    //   from: env.from,
    //   to: toList,
    //   subject,
    //   html: clean,
    // });
    // return NextResponse.json({ message: "Email sent" }, { status: 200 });

    // For now, until SMTP is configured:
    return NextResponse.json(
      {
        message: "SMTP configured check bypassed; uncomment nodemailer section to actually send.",
        info: { recipientsCount: recipients.length, contentLength: clean.length },
      },
      { status: 200 }
    );
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}