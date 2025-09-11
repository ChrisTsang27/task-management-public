import { NextRequest, NextResponse } from 'next/server';
import emailService from '@/lib/emailService';
import { authenticateRequest, createErrorResponse, createSuccessResponse } from '@/lib/api/utils';
import { rateLimiters } from '@/lib/middleware/rateLimiter';
import { emailTestSchema, validateAndSanitize, sanitizeHtml } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = rateLimiters.auth(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Authenticate user (only admins should be able to test email)
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.error!;
    }
    const { user, supabase } = authResult;

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return createErrorResponse('Admin access required', 403);
    }

    const body = await request.json();
    
    // Validate and sanitize input
    const validation = validateAndSanitize(body, emailTestSchema);
    if (!validation.success) {
      return createErrorResponse('Invalid email test data', 400, validation.errors);
    }
    const { to, subject, message, type = 'test' } = body;

    // Validate required fields
    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, message' },
        { status: 400 }
      );
    }

    // Verify SMTP connection first
    const isConnected = await emailService.verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'SMTP connection failed. Please check your email configuration.' },
        { status: 500 }
      );
    }

    let result;

    switch (type) {
      case 'announcement':
        const { announcementTitle, announcementContent, authorName } = body;
        if (!announcementTitle || !announcementContent || !authorName) {
          return NextResponse.json(
            { error: 'Missing required fields for announcement: announcementTitle, announcementContent, authorName' },
            { status: 400 }
          );
        }
        result = await emailService.sendAnnouncementNotification({
          to,
          announcementTitle,
          announcementContent,
          authorName
        });
        break;

      case 'task':
        const { taskTitle, taskDescription, assignedBy, dueDate } = body;
        if (!taskTitle || !taskDescription || !assignedBy) {
          return NextResponse.json(
            { error: 'Missing required fields for task: taskTitle, taskDescription, assignedBy' },
            { status: 400 }
          );
        }
        result = await emailService.sendTaskAssignmentNotification({
          to,
          taskTitle,
          taskDescription,
          assignedBy,
          dueDate
        });
        break;

      default:
        // Send a simple test email
        result = await emailService.sendEmail({
          to,
          subject,
          text: message,
          html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #333;">Test Email</h2>
            <p style="color: #666; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px;">This is a test email from the Task Tracking application.</p>
          </div>`
        });
        break;
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
        messageId: result.messageId
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to test SMTP connection
export async function GET() {
  try {
    const isConnected = await emailService.verifyConnection();
    
    return NextResponse.json({
      connected: isConnected,
      message: isConnected 
        ? 'SMTP connection successful' 
        : 'SMTP connection failed. Please check your configuration.'
    });
  } catch (error) {
    console.error('SMTP connection test error:', error);
    return NextResponse.json(
      { 
        connected: false, 
        error: 'Failed to test SMTP connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}