"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TemplateCustomizerProps {
  content: string;
  onContentUpdate: (updatedContent: string) => void;
  onClose: () => void;
}

interface PlaceholderField {
  key: string;
  label: string;
  placeholder: string;
  value: string;
}

const TemplateCustomizer: React.FC<TemplateCustomizerProps> = ({ 
  content, 
  onContentUpdate, 
  onClose 
}) => {
  // Extract placeholders from content
  const extractPlaceholders = (htmlContent: string): PlaceholderField[] => {
    const placeholderRegex = /\[([^\]]+)\]/g;
    const matches = [...htmlContent.matchAll(placeholderRegex)];
    const uniquePlaceholders = [...new Set(matches.map(match => match[1]))];
    
    return uniquePlaceholders.map(placeholder => ({
      key: placeholder,
      label: placeholder.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      placeholder: `Enter ${placeholder.toLowerCase()}`,
      value: ''
    }));
  };

  const [fields, setFields] = useState<PlaceholderField[]>(() => extractPlaceholders(content));

  const handleFieldChange = (key: string, value: string) => {
    setFields(prev => prev.map(field => 
      field.key === key ? { ...field, value } : field
    ));
  };

  const handleApplyCustomization = () => {
    let updatedContent = content;
    
    fields.forEach(field => {
      if (field.value.trim()) {
        const regex = new RegExp(`\\[${field.key}\\]`, 'g');
        updatedContent = updatedContent.replace(regex, field.value);
      }
    });
    
    onContentUpdate(updatedContent);
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  // Auto-close if no placeholders found
  React.useEffect(() => {
    if (fields.length === 0) {
      onClose();
    }
  }, [fields.length, onClose]);

  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="bg-slate-800/95 backdrop-blur-sm border-slate-600/50 shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            ✏️ Customize Template
          </CardTitle>
          <p className="text-sm text-slate-300">
            Fill in the placeholders to personalize your email template
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <label className="text-sm font-medium text-slate-200">
                {field.label}
              </label>
              <input
                type="text"
                value={field.value}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full rounded-lg bg-slate-900/80 border border-slate-600/50 px-3 py-2 outline-none focus:border-blue-500/50 transition-all text-slate-100 placeholder-slate-400"
              />
            </div>
          ))}
          
          <div className="flex gap-3 pt-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleApplyCustomization}
                  className="flex-1 rounded-lg px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium transition-all shadow-lg hover:shadow-xl"
                >
                  Apply Changes
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Replace placeholders with your information</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium transition-all border border-slate-600/50"
                >
                  Skip
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Use template as-is with placeholders</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          <div className="mt-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600/30">
            <p className="text-xs text-slate-300">
              💡 <strong>Tip:</strong> You can always edit the content manually after applying the template.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TemplateCustomizer;