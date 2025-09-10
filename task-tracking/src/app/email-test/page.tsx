'use client';

import { useState } from 'react';

import { CheckCircle, XCircle, Mail, Send, Settings } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface EmailTestResult {
  success: boolean;
  message?: string;
  messageId?: string;
  error?: string;
}

interface ConnectionStatus {
  connected: boolean;
  message: string;
  error?: string;
}

export default function EmailTestPage() {
  const [emailType, setEmailType] = useState('test');
  const [formData, setFormData] = useState({
    to: '',
    subject: '',
    message: '',
    // Announcement fields
    announcementTitle: '',
    announcementContent: '',
    authorName: '',
    // Task fields
    taskTitle: '',
    taskDescription: '',
    assignedBy: '',
    dueDate: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EmailTestResult | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus(null);
    
    try {
      const response = await fetch('/api/email/test', {
        method: 'GET'
      });
      
      const data = await response.json();
      setConnectionStatus(data);
    } catch (error) {
      setConnectionStatus({
        connected: false,
        message: 'Failed to test connection',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const sendTestEmail = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const payload = {
        type: emailType,
        to: formData.to,
        subject: formData.subject,
        message: formData.message,
        ...(emailType === 'announcement' && {
          announcementTitle: formData.announcementTitle,
          announcementContent: formData.announcementContent,
          authorName: formData.authorName
        }),
        ...(emailType === 'task' && {
          taskTitle: formData.taskTitle,
          taskDescription: formData.taskDescription,
          assignedBy: formData.assignedBy,
          dueDate: formData.dueDate || undefined
        })
      };
      
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderEmailTypeFields = () => {
    switch (emailType) {
      case 'announcement':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="announcementTitle">Announcement Title</Label>
              <Input
                id="announcementTitle"
                value={formData.announcementTitle}
                onChange={(e) => handleInputChange('announcementTitle', e.target.value)}
                placeholder="Enter announcement title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcementContent">Announcement Content</Label>
              <Textarea
                id="announcementContent"
                value={formData.announcementContent}
                onChange={(e) => handleInputChange('announcementContent', e.target.value)}
                placeholder="Enter announcement content"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="authorName">Author Name</Label>
              <Input
                id="authorName"
                value={formData.authorName}
                onChange={(e) => handleInputChange('authorName', e.target.value)}
                placeholder="Enter author name"
              />
            </div>
          </>
        );
      
      case 'task':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="taskTitle">Task Title</Label>
              <Input
                id="taskTitle"
                value={formData.taskTitle}
                onChange={(e) => handleInputChange('taskTitle', e.target.value)}
                placeholder="Enter task title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taskDescription">Task Description</Label>
              <Textarea
                id="taskDescription"
                value={formData.taskDescription}
                onChange={(e) => handleInputChange('taskDescription', e.target.value)}
                placeholder="Enter task description"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignedBy">Assigned By</Label>
              <Input
                id="assignedBy"
                value={formData.assignedBy}
                onChange={(e) => handleInputChange('assignedBy', e.target.value)}
                placeholder="Enter assigner name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
              />
            </div>
          </>
        );
      
      default:
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder="Enter email subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                placeholder="Enter email message"
                rows={4}
              />
            </div>
          </>
        );
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Mail className="h-8 w-8" />
            Email Service Test
          </h1>
          <p className="text-muted-foreground mt-2">
            Test your SMTP configuration and email functionality
          </p>
        </div>

        {/* Connection Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              SMTP Connection Test
            </CardTitle>
            <CardDescription>
              Verify that your SMTP server is properly configured
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testConnection} 
              disabled={isTestingConnection}
              variant="outline"
              className="w-full"
            >
              {isTestingConnection ? 'Testing...' : 'Test SMTP Connection'}
            </Button>
            
            {connectionStatus && (
              <Alert className={connectionStatus.connected ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <div className="flex items-center gap-2">
                  {connectionStatus.connected ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={connectionStatus.connected ? 'text-green-800' : 'text-red-800'}>
                    {connectionStatus.message}
                    {connectionStatus.error && (
                      <div className="mt-1 text-sm opacity-75">
                        Error: {connectionStatus.error}
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Email Test Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Test Email
            </CardTitle>
            <CardDescription>
              Send a test email to verify your email service is working
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailType">Email Type</Label>
              <Select value={emailType} onValueChange={setEmailType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">Simple Test Email</SelectItem>
                  <SelectItem value="announcement">Announcement Notification</SelectItem>
                  <SelectItem value="task">Task Assignment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="to">To Email Address</Label>
              <Input
                id="to"
                type="email"
                value={formData.to}
                onChange={(e) => handleInputChange('to', e.target.value)}
                placeholder="recipient@example.com"
              />
            </div>

            {renderEmailTypeFields()}

            <Button 
              onClick={sendTestEmail} 
              disabled={isLoading || !formData.to}
              className="w-full"
            >
              {isLoading ? 'Sending...' : 'Send Test Email'}
            </Button>
            
            {result && (
              <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={result.success ? 'text-green-800' : 'text-red-800'}>
                    {result.success ? (
                      <div>
                        {result.message}
                        {result.messageId && (
                          <div className="mt-1 text-sm opacity-75">
                            Message ID: {result.messageId}
                          </div>
                        )}
                      </div>
                    ) : (
                      result.error || 'Failed to send email'
                    )}
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Using Ethereal Email for testing? Check your emails at{' '}
            <a 
              href="https://ethereal.email/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              ethereal.email
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}