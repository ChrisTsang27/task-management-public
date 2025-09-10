"use client";

import React, { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import UnifiedTemplateCustomizer from "./UnifiedTemplateCustomizer";

interface TemplateCustomization {
  companyName: string;
  department: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  logoUrl: string;
  fontFamily: string;
  headerText: string;
  footerText: string;
  previewBackgroundColor: string;
  cardBackgroundColor: string;
  // Contact Information
  contactTel: string;
  contactWeb: string;
  contactEmail: string;
  contactAddress: string;
}

interface EmailTemplateProps {
  onApplyTemplate: (templateHtml: string, templateName?: string) => void;
  currentContent: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  preview: string;
  html: string;
}

const EmailTemplate: React.FC<EmailTemplateProps> = ({ onApplyTemplate, currentContent }) => {
  const [customTemplates, setCustomTemplates] = useState<Template[]>([]);
  const [savedCustomizations, setSavedCustomizations] = useState<Record<string, TemplateCustomization>>({});
  
  const templates: Template[] = [
    {
      id: "stonegate",
      name: "Stonegate Industries",
      description: "Official Stonegate Industries template with company branding",
      preview: "🏭 Stonegate Industries template",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <!-- Header with Stonegate Logo -->
          <div style="background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 3px solid #ff6b35;">
            <div style="display: inline-block; margin-bottom: 10px;">
              <div style="width: 120px; height: 120px; margin: 0 auto; border: 3px solid #ff6b35; border-radius: 50%; display: flex; align-items: center; justify-content: center; background-color: #ffffff;">
                <div style="text-align: center;">
                  <div style="color: #ff6b35; font-size: 24px; font-weight: bold; margin-bottom: 5px;">▼</div>
                  <div style="color: #333333; font-size: 14px; font-weight: bold; line-height: 1.2;">LOGO<br/>HERE</div>
                </div>
              </div>
            </div>
            <p style="margin: 10px 0 0 0; color: #333333; font-size: 14px; font-weight: 500;">Professional Communication</p>
          </div>
          
          <!-- Content Area -->
          <div style="padding: 30px 20px;">
            <!-- Greeting -->
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">Hi [Recipient Name],</p>
            
            <!-- Main Content -->
            <div style="margin: 20px 0; line-height: 1.6; color: #333333;">
              {Please enter your content here using the rich editor below, not in this template customizer}
            </div>
            
            <!-- Signature -->
            <div style="margin-top: 30px;">
              <p style="margin: 0 0 5px 0; font-size: 16px; color: #333333;">Best regards,</p>
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; font-weight: 500;">[Your Name]</p>
            </div>
          </div>
          
          <!-- Footer with Contact Info -->
          <div style="background-color: #f8fafc; padding: 20px; border-top: 1px solid #e5e7eb;">
            <div style="text-align: center; margin-bottom: 15px;">
              <div style="width: 80px; height: 80px; margin: 0 auto; border: 2px solid #ff6b35; border-radius: 50%; display: flex; align-items: center; justify-content: center; background-color: #ffffff;">
                <div style="text-align: center;">
                  <div style="color: #ff6b35; font-size: 16px; font-weight: bold; margin-bottom: 2px;">▼</div>
                  <div style="color: #333333; font-size: 10px; font-weight: bold; line-height: 1.1;">LOGO<br/>HERE</div>
                </div>
              </div>
            </div>
            <div style="text-align: left; font-size: 14px; color: #666666; line-height: 1.5;">
              <p style="margin: 0 0 5px 0;"><strong>Tel:</strong> 0401 924 666</p>
              <p style="margin: 0 0 5px 0;"><strong>Web:</strong> <a href="https://www.stonegateindustries.com.au" style="color: #ff6b35; text-decoration: none;">www.stonegateindustries.com.au</a></p>
              <p style="margin: 0 0 5px 0;"><strong>Email:</strong> <a href="mailto:outdoor@stonegateindustries.com.au" style="color: #ff6b35; text-decoration: none;">outdoor@stonegateindustries.com.au</a></p>
              <p style="margin: 0 0 15px 0;"><strong>Address:</strong> Unit 1, 739 Boundary Road, Coopers Plains, QLD 4108</p>
            </div>
          </div>
        </div>
      `
    },
    {
      id: "professional",
      name: "Professional",
      description: "Company logo, greeting, and signature",
      preview: "📧 Professional business template",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <!-- Header with Company Logo -->
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 20px; text-align: center;">
            <div style="background-color: white; display: inline-block; padding: 10px 20px; border-radius: 8px; margin-bottom: 10px;">
              <h2 style="margin: 0; color: #1e40af; font-size: 24px; font-weight: bold;">Your Company</h2>
            </div>
            <p style="margin: 0; color: white; font-size: 14px;">Professional Communication</p>
          </div>
          
          <!-- Content Area -->
          <div style="padding: 30px 20px;">
            <!-- Greeting -->
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">Dear Valued Team Member,</p>
            
            <!-- Main Content Placeholder -->
            <div style="margin: 20px 0; color: #374151;">
              {Please enter your content here using the rich editor below, not in this template customizer}
            </div>
          </div>
          
          <!-- Footer with Signature -->
          <div style="background-color: #f8fafc; padding: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 10px 0; font-size: 16px; color: #374151;">Kind regards,</p>
            <div style="margin-top: 15px;">
              <p style="margin: 0; font-weight: bold; color: #1e40af; font-size: 16px;">[Your Name]</p>
              <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">[Your Position]</p>
              <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Your Company Name</p>
              <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #9ca3af; font-size: 12px;">📧 [email@company.com] | 📞 [phone] | 🌐 [website.com]</p>
              </div>
            </div>
          </div>
        </div>
      `
    },
    {
      id: "simple",
      name: "Simple",
      description: "Clean and minimal template",
      preview: "✨ Simple clean template",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <!-- Simple Header -->
          <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
            <h1 style="margin: 0; color: #1f2937; font-size: 28px; font-weight: 300;">Your Company</h1>
          </div>
          
          <!-- Greeting -->
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">Hello,</p>
          
          <!-- Content Placeholder -->
          <div style="margin: 20px 0; color: #374151;">
            {Please enter your content here using the rich editor below, not in this template customizer}
          </div>
          
          <!-- Simple Signature -->
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 5px 0; color: #374151;">Best regards,</p>
            <p style="margin: 0; font-weight: 500; color: #1f2937;">[Your Name]</p>
          </div>
        </div>
      `
    },
    {
      id: "announcement",
      name: "Announcement",
      description: "For important company announcements",
      preview: "📢 Announcement template",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Announcement Header -->
          <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 25px; text-align: center; color: white;">
            <div style="font-size: 32px; margin-bottom: 10px;">📢</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Important Announcement</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 14px;">From Your Company Leadership</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px 25px;">
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">Dear Team,</p>
            
            <!-- Announcement Content -->
            <div style="margin: 25px 0; color: #374151;">
              {Please enter your content here using the rich editor below, not in this template customizer}
            </div>
            
            <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">Thank you for your attention to this matter.</p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 20px 25px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 10px 0; color: #374151;">Sincerely,</p>
            <p style="margin: 0; font-weight: bold; color: #1e40af;">[Leadership Team]</p>
            <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Your Company Name</p>
          </div>
        </div>
      `
    }
  ];

  const handleApplyTemplate = (template: Template) => {
    // Pass both template HTML and name to the parent component
    // The parent will handle content merging based on template mode
    onApplyTemplate(template.html, template.name);
  };

  const handleSaveCustomTemplate = (customTemplate: Template) => {
    setCustomTemplates(prev => [...prev, { ...customTemplate, id: `custom-${Date.now()}` }]);
  };

  const handleSaveCustomization = (templateId: string, customization: TemplateCustomization) => {
    setSavedCustomizations(prev => ({
      ...prev,
      [templateId]: customization
    }));
  };

  const getDisplayName = (template: Template) => {
    const customization = savedCustomizations[template.id];
    if (customization && customization.companyName && customization.companyName !== "Your Company") {
      const baseName = customization.companyName;
      const department = customization.department?.trim();
      return department ? `${baseName} ${department} Template` : `${baseName} Template`;
    }
    return template.name;
  };

  const getDisplayDescription = (template: Template) => {
    const customization = savedCustomizations[template.id];
    if (customization && customization.companyName && customization.companyName !== "Your Company") {
      const baseName = customization.companyName;
      const department = customization.department?.trim();
      const companyName = department ? `${baseName} ${department}` : baseName;
      return `Customized ${template.name.toLowerCase()} template for ${companyName}`;
    }
    return template.description;
  };

  const allTemplates = [...templates, ...customTemplates];

  return (
    <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-600/50 shadow-xl">
      <CardHeader>
        <CardTitle className="text-lg text-white">Email Templates</CardTitle>
        <p className="text-sm text-slate-300">Choose a professional template to get started</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allTemplates.map((template) => (
            <div key={template.id} className="bg-gradient-to-br from-slate-700/80 to-slate-800/80 border border-slate-600/50 rounded-xl shadow-lg hover:shadow-xl ring-1 ring-slate-300/10 hover:ring-slate-300/20 transition-all overflow-hidden">
              {/* Header with Customize Button */}
              <div className="flex items-center justify-between p-3 border-b border-slate-600/30">
                <div className="text-xl">{template.preview}</div>
                <UnifiedTemplateCustomizer
                  template={template}
                  onSave={handleSaveCustomTemplate}
                  onApply={onApplyTemplate}
                  onCustomizationSave={(customization) => handleSaveCustomization(template.id, customization)}
                  mode="template"
                />
              </div>
              
              {/* Content Area */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleApplyTemplate(template)}
                    className="w-full p-4 text-left group hover:bg-slate-600/20 transition-all min-h-[120px] flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="font-semibold text-white text-base leading-tight">{getDisplayName(template)}</div>
                      <div className="text-sm text-slate-300 leading-relaxed">{getDisplayDescription(template)}</div>
                    </div>
                    <div className="mt-4 text-sm text-blue-400 group-hover:text-blue-300 transition-colors font-medium">
                      Click to apply →
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Apply {template.name} template</p>
                </TooltipContent>
              </Tooltip>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600/30">
          <p className="text-xs text-slate-300">
            💡 <strong>Tip:</strong> Click &quot;Customize&quot; to personalize templates with your logo, colors, and branding. Templates include placeholders like [Your Name] and [Your Position] that you can customize after applying.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailTemplate;