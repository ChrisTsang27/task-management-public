'use client';

import { useState } from 'react';

import { CheckCircle, XCircle, Mail } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function EmailHtmlTestPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  const sendHtmlTestEmail = async () => {
    if (!email) return;
    
    setIsLoading(true);
    setResult(null);
    
    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <!-- Header with Company Logo -->
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 20px; text-align: center;">
            <div style="background-color: white; display: inline-block; padding: 10px 20px; border-radius: 8px; margin-bottom: 10px;">
              <h2 style="margin: 0; color: #1e40af; font-size: 24px; font-weight: bold;">🏢 STONEGATE OUTDOOR</h2>
            </div>
            <p style="margin: 0; color: white; font-size: 14px;">HTML Email Test</p>
          </div>
          
          <!-- Content Area -->
          <div style="padding: 30px 20px;">
            <h3 style="color: #1e40af; margin-top: 0;">📧 HTML Email Formatting Test</h3>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">Hi there,</p>
            
            <p style="margin: 0 0 20px 0; color: #374151; line-height: 1.6;">This is a test email to verify that <strong>HTML formatting</strong> is working correctly. The email should display with:</p>
            
            <ul style="margin: 20px 0; padding-left: 20px; color: #374151;">
              <li style="margin-bottom: 8px;">✅ <strong>Bold text</strong> and <em>italic text</em></li>
              <li style="margin-bottom: 8px;">🎨 <span style="color: #dc2626;">Colored text</span> and backgrounds</li>
              <li style="margin-bottom: 8px;">📋 Proper list formatting</li>
              <li style="margin-bottom: 8px;">🖼️ Images and logos</li>
              <li style="margin-bottom: 8px;">📐 Table layouts and spacing</li>
            </ul>
            
            <div style="background-color: #f3f4f6; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #1f2937; font-weight: 600;">💡 Important Note:</p>
              <p style="margin: 5px 0 0 0; color: #4b5563;">If you can see this formatted content with colors, fonts, and layout, then HTML emails are working correctly!</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #e5e7eb;">
              <thead>
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; color: #374151; font-weight: 600;">Feature</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; color: #374151; font-weight: 600;">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">HTML Formatting</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #059669; font-weight: 600;">✅ Working</td>
                </tr>
                <tr style="background-color: #f9fafb;">
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">CSS Styles</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #059669; font-weight: 600;">✅ Applied</td>
                </tr>
                <tr>
                  <td style="padding: 12px; color: #4b5563;">Email Templates</td>
                  <td style="padding: 12px; color: #059669; font-weight: 600;">✅ Functional</td>
                </tr>
              </tbody>
            </table>
            
            <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px; font-style: italic;">Best regards,<br>Task Tracking System</p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 12px;">This is an automated test email from the Task Tracking System</p>
          </div>
        </div>
      `;
      
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: [{ name: 'Test User', email: email }],
          subject: '🧪 HTML Email Formatting Test - Task Tracking System',
          content: htmlContent,
          timestamp: new Date().toISOString(),
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult({
          success: true,
          message: `HTML test email sent successfully! ${data.messageId ? `Message ID: ${data.messageId}` : ''}`
        });
      } else {
        setResult({
          success: false,
          error: data.message || 'Failed to send email'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: 'Network error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center gap-2">
              <Mail className="h-6 w-6" />
              HTML Email Test
            </CardTitle>
            <CardDescription className="text-slate-400">
              Send a test email with rich HTML formatting to verify email templates are working correctly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">Test Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@example.com"
                className="bg-slate-700 border-slate-600 text-slate-200"
              />
            </div>
            
            <Button 
              onClick={sendHtmlTestEmail} 
              disabled={isLoading || !email}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Sending HTML Test Email...' : '📧 Send HTML Test Email'}
            </Button>
            
            {result && (
              <Alert className={`${result.success ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <AlertDescription className={result.success ? 'text-green-300' : 'text-red-300'}>
                    {result.success ? result.message : result.error}
                  </AlertDescription>
                </div>
              </Alert>
            )}
            
            <div className="mt-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
              <h3 className="text-slate-200 font-semibold mb-2">📋 What to Check:</h3>
              <ul className="text-slate-300 text-sm space-y-1">
                <li>• Email should have a blue gradient header with company logo</li>
                <li>• Text should be formatted with different colors and styles</li>
                <li>• Lists and tables should be properly structured</li>
                <li>• Background colors and borders should be visible</li>
                <li>• If you see plain text only, HTML formatting is not working</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}