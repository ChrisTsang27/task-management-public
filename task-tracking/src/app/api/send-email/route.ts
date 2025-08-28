import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, subject, content, recipients, timestamp } = body || {};
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
          payload: { title, subject, contentLength: content?.length, recipientsCount: recipients?.length, timestamp },
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
    // const toList = (recipients || []).map((r: any) => `${r.name} <${r.email}>`).join(", ");
    // await transporter.sendMail({
    //   from: env.from,
    //   to: toList,
    //   subject,
    //   html: content,
    // });
    // return NextResponse.json({ message: "Email sent" }, { status: 200 });

    // For now, until SMTP is configured:
    return NextResponse.json(
      {
        message:
          "SMTP configured check bypassed; uncomment nodemailer section to actually send.",
        info: { recipientsCount: recipients?.length || 0 },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Unexpected error" }, { status: 500 });
  }
}