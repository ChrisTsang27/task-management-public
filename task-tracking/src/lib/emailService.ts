import nodemailer from 'nodemailer';

import type { Transporter } from 'nodemailer';

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Email message interface
interface EmailMessage {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

// Default SMTP configuration using environment variables
const defaultConfig: EmailConfig = {
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'ethereal.user@ethereal.email',
    pass: process.env.SMTP_PASS || 'ethereal.pass'
  }
};

class EmailService {
  private transporter: Transporter;
  private config: EmailConfig;

  constructor(config?: EmailConfig) {
    this.config = config || defaultConfig;
    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.auth.user,
        pass: this.config.auth.pass
      }
    });
  }

  // Verify SMTP connection
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      // SMTP connection failed
      return false;
    }
  }

  // Send email
  async sendEmail(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const mailOptions = {
        from: message.from || process.env.EMAIL_FROM || this.config.auth.user,
        to: Array.isArray(message.to) ? message.to.join(', ') : message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        headers: {
          'X-Mailer': 'Task Tracking System',
          'X-Priority': '3',
          'MIME-Version': '1.0'
        },
        // Ensure HTML content is properly formatted
        alternatives: message.html ? [{
          contentType: 'text/html; charset=UTF-8',
          content: message.html
        }] : undefined
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      // Failed to send email
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Send notification email for new announcements
  async sendAnnouncementNotification({
    to,
    announcementTitle,
    announcementContent,
    authorName
  }: {
    to: string | string[];
    announcementTitle: string;
    announcementContent: string;
    authorName: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const subject = `New Announcement: ${announcementTitle}`;
    const text = `
A new announcement has been posted by ${authorName}:

Title: ${announcementTitle}

Content:
${announcementContent}

Best regards,
Task Tracking Team
    `;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          New Announcement
        </h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #007bff; margin-top: 0;">${announcementTitle}</h3>
          <p style="color: #666; margin-bottom: 15px;">Posted by: <strong>${authorName}</strong></p>
          <div style="color: #333; line-height: 1.6;">
            ${announcementContent.replace(/\n/g, '<br>')}
          </div>
        </div>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Best regards,<br>
          Task Tracking Team
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject,
      text,
      html
    });
  }

  // Send task assignment notification
  async sendTaskAssignmentNotification({
    to,
    taskTitle,
    taskDescription,
    assignedBy,
    dueDate
  }: {
    to: string | string[];
    taskTitle: string;
    taskDescription: string;
    assignedBy: string;
    dueDate?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const subject = `Task Assigned: ${taskTitle}`;
    const dueDateText = dueDate ? `\nDue Date: ${dueDate}` : '';
    
    const text = `
You have been assigned a new task by ${assignedBy}:

Task: ${taskTitle}

Description:
${taskDescription}${dueDateText}

Best regards,
Task Tracking Team
    `;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #28a745; padding-bottom: 10px;">
          Task Assignment
        </h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #28a745; margin-top: 0;">${taskTitle}</h3>
          <p style="color: #666; margin-bottom: 15px;">Assigned by: <strong>${assignedBy}</strong></p>
          ${dueDate ? `<p style="color: #dc3545; margin-bottom: 15px;">Due Date: <strong>${dueDate}</strong></p>` : ''}
          <div style="color: #333; line-height: 1.6;">
            ${taskDescription.replace(/\n/g, '<br>')}
          </div>
        </div>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Best regards,<br>
          Task Tracking Team
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject,
      text,
      html
    });
  }
}

// Create and export a default instance
const emailService = new EmailService();

export default emailService;
export { EmailService, type EmailConfig, type EmailMessage };