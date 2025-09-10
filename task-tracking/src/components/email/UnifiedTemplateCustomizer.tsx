"use client";

import React, { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, XCircle, Save, Palette, Type, Image as ImageIcon, Edit3, X, Phone, Contact } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Template {
  id: string;
  name: string;
  description: string;
  preview: string;
  html: string;
}

interface UnifiedTemplateCustomizerProps {
  template: Template;
  content?: string;
  onSave?: (updatedTemplate: Template) => void;
  onApply: (templateHtml: string) => void;
  onClose?: () => void;
  onCustomizationSave?: (customization: TemplateCustomization) => void;
  mode?: 'template' | 'content'; // template mode for visual customization, content mode for placeholder replacement
}

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

interface PlaceholderField {
  key: string;
  label: string;
  placeholder: string;
  value: string;
}

const UnifiedTemplateCustomizer: React.FC<UnifiedTemplateCustomizerProps> = ({ 
  template, 
  content,
  onSave, 
  onApply,
  onClose,
  onCustomizationSave,
  mode = 'template'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  
  // Visual customization state
  const [customization, setCustomization] = useState<TemplateCustomization>({
    companyName: "[Company Name]",
    department: "[Department]",
    primaryColor: "#1e40af",
    secondaryColor: "#3b82f6",
    backgroundColor: "#ffffff",
    textColor: "#374151",
    logoUrl: "",
    fontFamily: "Arial, sans-serif",
    headerText: "",
    footerText: "",
    previewBackgroundColor: "#ffffff",
    cardBackgroundColor: "#ffffff",
    // Contact Information defaults
    contactTel: "",
    contactWeb: "",
    contactEmail: "",
    contactAddress: ""
  });
  
  // Placeholder replacement state
  const [placeholderFields, setPlaceholderFields] = useState<PlaceholderField[]>([]);
  
  const [previewHtml, setPreviewHtml] = useState(template.html);
  const [logoPreview, setLogoPreview] = useState<string>("");

  // Extract placeholders from content
  const extractPlaceholders = useCallback((htmlContent: string): PlaceholderField[] => {
    const placeholderRegex = /\[([^\]]+)\]/g;
    const matches = [...htmlContent.matchAll(placeholderRegex)];
    const uniquePlaceholders = [...new Set(matches.map(match => match[1]))];
    
    return uniquePlaceholders.map(placeholder => ({
      key: placeholder,
      label: placeholder.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      placeholder: `Enter ${placeholder.toLowerCase()}`,
      value: ''
    }));
  }, []);

  // Initialize placeholder fields when content or template changes
  useEffect(() => {
    const htmlToCheck = content || template.html;
    if (htmlToCheck) {
      const fields = extractPlaceholders(htmlToCheck);
      setPlaceholderFields(fields);
      // Set initial tab to placeholders if in content mode and placeholders exist
      if (mode === 'content' && fields.length > 0) {
        setActiveTab('placeholders');
      }
    }
  }, [content, template.html, extractPlaceholders, mode]);

  // Auto-open in content mode if placeholders exist
  useEffect(() => {
    if (mode === 'content' && content) {
      const placeholders = extractPlaceholders(content);
      if (placeholders.length > 0) {
        setIsOpen(true);
      }
    }
  }, [mode, content, extractPlaceholders]);

  // Auto-open in content mode
  useEffect(() => {
    if (mode === 'content') {
      setIsOpen(true);
    }
  }, [mode]);

  const generateCustomizedHtml = useCallback(() => {
    let customHtml = template.html;
    
    // Apply visual customizations
    customHtml = customHtml.replace(/Your Company/g, customization.companyName);
    customHtml = customHtml.replace(/Your Company Name/g, customization.companyName);
    customHtml = customHtml.replace(/Stonegate Outdoor/g, customization.companyName);
    customHtml = customHtml.replace(/Professional Communication/g, customization.headerText || '[Header Text]');
    // Replace footer text based on template type
    customHtml = customHtml.replace(/Kind regards,/g, customization.footerText || '[Footer Text]');
    customHtml = customHtml.replace(/Best regards,/g, customization.footerText || '[Footer Text]');
    customHtml = customHtml.replace(/Sincerely,/g, customization.footerText || '[Footer Text]');
    // Replace Stonegate-specific contact information with customizable values
    customHtml = customHtml.replace(/0401 924 666/g, customization.contactTel || '[Contact Number]');
    customHtml = customHtml.replace(/www\.stonegateindustries\.com\.au/g, customization.contactWeb || '[Website]');
    customHtml = customHtml.replace(/outdoor@stonegateindustries\.com\.au/g, customization.contactEmail || '[Email Address]');
    customHtml = customHtml.replace(/Unit 1, 739 Boundary Road, Coopers Plains, QLD 4108/g, customization.contactAddress || '[Business Address]');
    customHtml = customHtml.replace(/https:\/\/www\.stonegateindustries\.com\.au/g, customization.contactWeb ? `https://${customization.contactWeb}` : '[Website]');
    customHtml = customHtml.replace(/mailto:outdoor@stonegateindustries\.com\.au/g, customization.contactEmail ? `mailto:${customization.contactEmail}` : '[Email Address]');
    customHtml = customHtml.replace(/#1e40af/g, customization.primaryColor);
    customHtml = customHtml.replace(/#3b82f6/g, customization.secondaryColor);
    // Apply card background color first (more specific)
    customHtml = customHtml.replace(/background-color: #ffffff/g, `background-color: ${customization.cardBackgroundColor}`);
    // Then apply general background color (less specific, won't affect card backgrounds)
    customHtml = customHtml.replace(/#ffffff/g, customization.backgroundColor);
    customHtml = customHtml.replace(/#374151/g, customization.textColor);
    customHtml = customHtml.replace(/Arial, sans-serif/g, customization.fontFamily);
    
    // Conditional logo replacement - only replace if logo is uploaded
    if (customization.logoUrl && template.id === 'stonegate') {
      // Replace the header Stonegate logo placeholder with uploaded logo
      const headerLogoHtml = `<img src="${customization.logoUrl}" alt="${customization.companyName}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #ff6b35;" />`;
      
      // Use a more targeted approach - look for the specific placeholder text
      const headerPlaceholder = 'LOGO<br/>HERE';
      if (customHtml.includes(headerPlaceholder)) {
        // Find the div containing the 120px width and replace the entire logo container
        const headerStart = customHtml.indexOf('<div style="width: 120px; height: 120px;');
        if (headerStart !== -1) {
          const headerEnd = customHtml.indexOf('</div>', customHtml.indexOf('</div>', headerStart) + 6) + 6;
          const headerSection = customHtml.substring(headerStart, headerEnd);
          customHtml = customHtml.replace(headerSection, headerLogoHtml);
        }
      }
      
      // Replace the footer Stonegate logo placeholder with uploaded logo
      const footerLogoHtml = `<img src="${customization.logoUrl}" alt="${customization.companyName}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid #ff6b35;" />`;
      
      // Similar approach for footer logo
      const footerStart = customHtml.indexOf('<div style="width: 80px; height: 80px;');
      if (footerStart !== -1) {
        const footerEnd = customHtml.indexOf('</div>', customHtml.indexOf('</div>', footerStart) + 6) + 6;
        const footerSection = customHtml.substring(footerStart, footerEnd);
        customHtml = customHtml.replace(footerSection, footerLogoHtml);
      }
    }
    
    return customHtml;
  }, [template, customization]);

  const applyPlaceholderReplacements = useCallback((htmlContent: string) => {
    let updatedContent = htmlContent;
    
    placeholderFields.forEach(field => {
      const regex = new RegExp(`\\[${field.key}\\]`, 'g');
      // Replace with field value or keep original placeholder if no value provided
      updatedContent = updatedContent.replace(regex, field.value || `[${field.key}]`);
    });
    
    return updatedContent;
  }, [placeholderFields]);

  const handleLogoUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setLogoPreview(result);
        setCustomization(prev => ({ ...prev, logoUrl: result }));
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleLogoRemove = useCallback(() => {
    setLogoPreview("");
    setCustomization(prev => ({ ...prev, logoUrl: "" }));
    // Clear the file input
    const fileInput = document.getElementById('logo') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }, []);

  // Auto-update preview when customization changes
  useEffect(() => {
    let customizedHtml = generateCustomizedHtml();
    if (mode === 'content' && content) {
      customizedHtml = applyPlaceholderReplacements(content);
    } else {
      // Apply placeholder replacements to the customized HTML for template mode
      customizedHtml = applyPlaceholderReplacements(customizedHtml);
    }
    setPreviewHtml(customizedHtml);
  }, [customization, placeholderFields, generateCustomizedHtml, applyPlaceholderReplacements, mode, content]);

  const handleCustomizationChange = useCallback((field: keyof TemplateCustomization, value: string) => {
    setCustomization(prev => ({ ...prev, [field]: value }));
  }, []);

  const handlePlaceholderChange = useCallback((key: string, value: string) => {
    setPlaceholderFields(prev => prev.map(field => 
      field.key === key ? { ...field, value } : field
    ));
  }, []);

  const handlePreview = useCallback(() => {
    let customizedHtml = generateCustomizedHtml();
    if (mode === 'content' && content) {
      customizedHtml = applyPlaceholderReplacements(content);
    } else {
      // Apply placeholder replacements to the customized HTML for template mode
      customizedHtml = applyPlaceholderReplacements(customizedHtml);
    }
    setPreviewHtml(customizedHtml);
  }, [generateCustomizedHtml, applyPlaceholderReplacements, mode, content]);

  const handleSave = useCallback(() => {
    if (onSave) {
      const customizedHtml = generateCustomizedHtml();
      const updatedTemplate: Template = {
        ...template,
        name: `${template.name} (Custom)`,
        html: customizedHtml
      };
      onSave(updatedTemplate);
    }
    
    // Save customization data for template card display
    if (onCustomizationSave) {
      onCustomizationSave(customization);
    }
    
    setIsOpen(false);
  }, [template, generateCustomizedHtml, onSave, onCustomizationSave, customization]);

  const handleApply = useCallback(() => {
    try {
      let finalHtml = generateCustomizedHtml();
      
      // Apply placeholder replacements if placeholders exist and are filled
      if (placeholderFields.length > 0) {
        finalHtml = applyPlaceholderReplacements(finalHtml);
      }
      
      // Save customization data for template card display
      if (onCustomizationSave) {
        onCustomizationSave(customization);
      }
      
      onApply(finalHtml);
      setIsOpen(false);
      if (onClose) onClose();
    } catch (error) {
      console.error('Error in handleApply:', error);
    }
  }, [generateCustomizedHtml, applyPlaceholderReplacements, onApply, onClose, placeholderFields, onCustomizationSave, customization]);

  const handleSkip = useCallback(() => {
    setIsOpen(false);
    if (onClose) onClose();
  }, [onClose]);

  // Determine available tabs based on mode and content
  const getAvailableTabs = () => {
    const tabs = [];
    
    // Always show visual customization tabs
    tabs.push(
      { value: 'branding', label: 'Branding', icon: ImageIcon },
      { value: 'contact', label: 'Contact', icon: Contact }
    );
    
    // Add placeholders tab if template has placeholders (check both content and template.html)
    const templateHasPlaceholders = /\[[^\]]+\]/.test(template.html);
    if ((content && placeholderFields.length > 0) || (mode === 'template' && templateHasPlaceholders)) {
      tabs.push({ value: 'placeholders', label: 'Placeholders', icon: Edit3 });
    }
    
    return tabs;
  };

  const availableTabs = getAvailableTabs();

  // Auto-close if no customization options available (only for content mode)
  if (mode === 'content' && placeholderFields.length === 0) {
    return null;
  }

  const triggerButton = mode === 'content' ? null : (
    <Button 
      variant="outline" 
      size="sm" 
      className="ml-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-blue-500 shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
    >
      <Palette className="w-4 h-4 mr-1" />
      Customize
    </Button>
  );



  const dialogContent = (
    <DialogContent className="max-w-[95vw] sm:max-w-7xl max-h-[92vh] overflow-y-auto bg-gradient-to-br from-slate-50 to-white border-slate-200/50 shadow-2xl">
      <DialogHeader className="border-b border-slate-200/50 pb-6">
        <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-slate-900">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
            <Palette className="w-5 h-5 text-white" />
          </div>
          {mode === 'content' ? 'Customize Template' : `Customize Template: ${customization.companyName || template.name}`}
        </DialogTitle>
        {mode === 'content' && (
          <p className="text-sm text-slate-600 mt-2">
            Fill in the placeholders to personalize your email template
          </p>
        )}
      </DialogHeader>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customization Panel */}
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:flex bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50">
              {availableTabs.filter(tab => tab.value !== 'colors').map(tab => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.value} value={tab.value} className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-3 rounded-lg font-medium transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 text-xs sm:text-sm">
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            
            {/* Branding Tab */}
            <TabsContent value="branding" className="space-y-6">
              <Card className="border-slate-200/50 shadow-sm bg-gradient-to-br from-white to-slate-50/50">
                <CardHeader className="border-b border-slate-200/50">
                  <CardTitle className="text-base flex items-center gap-3 text-slate-900">
                    <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg">
                      <ImageIcon className="w-4 h-4 text-white" />
                    </div>
                    Logo & Company
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-sm font-medium text-slate-700">Company Name</Label>
                    <Input
                      id="companyName"
                      value={customization.companyName}
                      onChange={(e) => handleCustomizationChange('companyName', e.target.value)}
                      placeholder="Your Company Name"
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 text-slate-900 font-medium bg-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-sm font-medium text-slate-700">Department (Optional)</Label>
                    <Input
                      id="department"
                      value={customization.department}
                      onChange={(e) => handleCustomizationChange('department', e.target.value)}
                      placeholder="e.g., HR, Marketing, Sales"
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 text-slate-900 font-medium bg-white"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="logo" className="text-sm font-medium text-slate-700">Company Logo</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="logo"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="flex-1 border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 text-slate-900 font-medium bg-white"
                      />
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <Upload className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                    {logoPreview && (
                      <div className="mt-4 p-4 border rounded-lg">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 border rounded-md overflow-hidden bg-muted flex items-center justify-center">
                              <Image 
                                src={logoPreview} 
                                alt="Logo preview" 
                                width={64}
                                height={64}
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                            <div className="text-sm">
                              <p className="font-medium">Logo Preview</p>
                              <p className="text-muted-foreground">Click remove to delete</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={handleLogoRemove}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fontFamily" className="text-sm font-medium text-slate-700">Font Family</Label>
                    <select
                      id="fontFamily"
                      value={customization.fontFamily}
                      onChange={(e) => handleCustomizationChange('fontFamily', e.target.value)}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 bg-white text-slate-900 font-medium shadow-sm hover:border-slate-400"
                      style={{ color: '#1e293b' }}
                    >
                      <option value="Arial, sans-serif" className="text-slate-900 bg-white py-2">Arial</option>
                      <option value="Georgia, serif" className="text-slate-900 bg-white py-2">Georgia</option>
                      <option value="'Times New Roman', serif" className="text-slate-900 bg-white py-2">Times New Roman</option>
                      <option value="'Helvetica Neue', sans-serif" className="text-slate-900 bg-white py-2">Helvetica</option>
                      <option value="Verdana, sans-serif" className="text-slate-900 bg-white py-2">Verdana</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            

            

            
            {/* Contact Tab */}
            <TabsContent value="contact" className="space-y-6">
              <Card className="border-slate-200/50 shadow-sm bg-gradient-to-br from-white to-slate-50/50">
                <CardHeader className="border-b border-slate-200/50">
                  <CardTitle className="text-base flex items-center gap-3 text-slate-900">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg">
                       <Contact className="w-4 h-4 text-white" />
                     </div>
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="contactTel" className="text-sm font-medium text-slate-700">Phone Number</Label>
                    <Input
                      id="contactTel"
                      value={customization.contactTel}
                      onChange={(e) => handleCustomizationChange('contactTel', e.target.value)}
                      placeholder="Enter your contact number"
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 text-slate-900 font-medium bg-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contactWeb" className="text-sm font-medium text-slate-700">Website</Label>
                    <Input
                      id="contactWeb"
                      value={customization.contactWeb}
                      onChange={(e) => handleCustomizationChange('contactWeb', e.target.value)}
                      placeholder="Enter your website"
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 text-slate-900 font-medium bg-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail" className="text-sm font-medium text-slate-700">Email Address</Label>
                    <Input
                      id="contactEmail"
                      value={customization.contactEmail}
                      onChange={(e) => handleCustomizationChange('contactEmail', e.target.value)}
                      placeholder="Enter your email address"
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 text-slate-900 font-medium bg-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contactAddress" className="text-sm font-medium text-slate-700">Address</Label>
                    <Textarea
                      id="contactAddress"
                      value={customization.contactAddress}
                      onChange={(e) => handleCustomizationChange('contactAddress', e.target.value)}
                      placeholder="Enter your business address"
                      rows={3}
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 resize-none text-slate-900 font-medium bg-white"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Placeholders Tab */}
             <TabsContent value="placeholders" className="space-y-6">
               <Card className="border-slate-200/50 shadow-sm bg-gradient-to-br from-white to-slate-50/50">
                 <CardHeader className="border-b border-slate-200/50">
                   <CardTitle className="text-base flex items-center gap-3 text-slate-900">
                     <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                       <Type className="w-4 h-4 text-white" />
                    </div>
                    Placeholders
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* Header Text */}
                  <div className="space-y-2">
                    <Label htmlFor="headerText" className="text-sm font-medium text-slate-700">Header Text</Label>
                    <Input
                      id="headerText"
                      value={customization.headerText}
                      onChange={(e) => handleCustomizationChange('headerText', e.target.value)}
                      placeholder="Enter header text"
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 text-slate-900 font-medium bg-white"
                    />
                  </div>
                  
                  {/* Recipient-related placeholders */}
                  {placeholderFields.filter(field => 
                    field.key.toLowerCase().includes('recipient') || 
                    field.key.toLowerCase().includes('client') ||
                    field.key.toLowerCase().includes('customer')
                  ).map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={field.key} className="text-sm font-medium text-slate-700">
                        {field.label}
                      </Label>
                      <Input
                        id={field.key}
                        value={field.value}
                        onChange={(e) => handlePlaceholderChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 text-slate-900 font-medium bg-white"
                      />
                    </div>
                  ))}
                  
                  {/* Footer Text */}
                  <div className="space-y-2">
                    <Label htmlFor="footerText" className="text-sm font-medium text-slate-700">Footer Text</Label>
                    <Textarea
                      id="footerText"
                      value={customization.footerText}
                      onChange={(e) => handleCustomizationChange('footerText', e.target.value)}
                      placeholder="Enter footer text"
                      rows={3}
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 resize-none text-slate-900 font-medium bg-white"
                    />
                  </div>
                  
                  {/* Sender-related placeholders (Your Name, etc.) */}
                  {placeholderFields.filter(field => 
                    field.key.toLowerCase().includes('your') || 
                    field.key.toLowerCase().includes('sender') ||
                    field.key.toLowerCase().includes('author')
                  ).map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={field.key} className="text-sm font-medium text-slate-700">
                        {field.label}
                      </Label>
                      <Input
                        id={field.key}
                        value={field.value}
                        onChange={(e) => handlePlaceholderChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 text-slate-900 font-medium bg-white"
                      />
                    </div>
                  ))}
                  
                  {/* Other placeholders */}
                  {placeholderFields.filter(field => 
                    !field.key.toLowerCase().includes('recipient') && 
                    !field.key.toLowerCase().includes('client') &&
                    !field.key.toLowerCase().includes('customer') &&
                    !field.key.toLowerCase().includes('your') && 
                    !field.key.toLowerCase().includes('sender') &&
                    !field.key.toLowerCase().includes('author')
                  ).map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={field.key} className="text-sm font-medium text-slate-700">
                        {field.label}
                      </Label>
                      <Input
                        id={field.key}
                        value={field.value}
                        onChange={(e) => handlePlaceholderChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 text-slate-900 font-medium bg-white"
                      />
                    </div>
                  ))}
                  
                  {placeholderFields.length === 0 && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                        <Edit3 className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-500">
                        No placeholders found in this template.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onClose} variant="outline" size="default" className="flex-1">
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Cancel and close customizer</p>
              </TooltipContent>
            </Tooltip>
            
            {onSave && mode === 'template' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleSave} variant="secondary" size="default">
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Save as custom template</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={handleApply} variant="default" size="default" className="flex-1">
                      <span className="flex items-center gap-2">
                        <span>Apply Customizations</span>
                        <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse"></div>
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Apply visual customizations and replace placeholders</p>
                  </TooltipContent>
                </Tooltip>
            
            {mode === 'content' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleSkip} variant="ghost" size="default">
                    Skip
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Use template as-is with placeholders</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          
          {mode === 'content' && (
            <div className="mt-4 p-3 bg-slate-100 rounded-lg border">
              <p className="text-xs text-slate-600">
                💡 <strong>Tip:</strong> You can always edit the content manually after applying the template.
              </p>
            </div>
          )}
        </div>
        
        {/* Live Preview */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg">
              <XCircle className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-lg text-slate-900">Live Preview</h3>
          </div>
          <div className="border border-slate-200/50 rounded-xl p-6 shadow-sm max-h-[600px] overflow-y-auto" style={{ backgroundColor: customization.previewBackgroundColor }}>
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      </div>
    </DialogContent>
  );

  // For both template and content modes, use the Dialog component
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {triggerButton && (
        <DialogTrigger asChild>
          {triggerButton}
        </DialogTrigger>
      )}
      {dialogContent}
    </Dialog>
  );
};

export default UnifiedTemplateCustomizer;