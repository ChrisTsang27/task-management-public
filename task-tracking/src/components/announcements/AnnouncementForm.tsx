"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAnnouncement } from "@/lib/actions/announcements";
import { useSupabaseProfile } from "@/hooks/useSupabaseProfile";
import { Paperclip, X } from 'lucide-react';
import { LexicalRichTextEditor } from '@/components/ui/lexical-editor';

interface AnnouncementFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function AnnouncementForm({ onSuccess, onCancel }: AnnouncementFormProps) {
  const { profile } = useSupabaseProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    priority: "medium" as "low" | "medium" | "high",
    expires_at: ""
  });





  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = ['image/', 'application/pdf', 'text/', 'application/msword', 'application/vnd.openxmlformats-officedocument'];
      
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      
      if (!allowedTypes.some(type => file.type.startsWith(type))) {
        alert(`File ${file.name} is not a supported type.`);
        return false;
      }
      
      return true;
    });
    
    setAttachments(prev => [...prev, ...validFiles]);
    event.target.value = ''; // Reset input
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    setIsSubmitting(true);
    setUploadingFiles(true);
    
    try {
      // Upload files first if any
      let attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        const uploadFormData = new FormData();
        attachments.forEach((file, index) => {
          uploadFormData.append(`file_${index}`, file);
        });
        
        const uploadResponse = await fetch('/api/announcements/upload', {
          method: 'POST',
          body: uploadFormData,
        });
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          attachmentUrls = uploadResult.urls || [];
        } else {
          throw new Error('Failed to upload files');
        }
      }

      const announcementData = {
        title: formData.title,
        content: formData.content,
        priority: formData.priority,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        team_id: null, // For now, we'll make announcements global
        created_by: profile.id,
        attachments: attachmentUrls.map((url, index) => ({
          url,
          name: attachments[index]?.name || 'attachment',
          size: attachments[index]?.size || 0,
          type: attachments[index]?.type || 'application/octet-stream',
          path: url
        })),
      };
      
  
      const result = await createAnnouncement(announcementData);

      if (result.announcement && !result.error) {
        // Reset form
        setFormData({
          title: "",
          content: "",
          priority: "medium",
          expires_at: ""
        });
        setAttachments([]);
        onSuccess?.();
      } else {
        console.error("Failed to create announcement:", result.error);
        alert(result.error || "Failed to create announcement. Please try again.");
      }
    } catch (error) {
      console.error("Error creating announcement:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
      setUploadingFiles(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700 overflow-visible">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          Create New Announcement
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-visible">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium text-slate-300">
              Title *
            </label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="Enter announcement title..."
              required
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500"
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-medium text-slate-300">
              Content *
            </label>
            <LexicalRichTextEditor
              value={formData.content}
              onChange={(content) => handleInputChange("content", content)}
              placeholder="Write your announcement content with rich formatting..."
              className="min-h-[200px]"
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <label htmlFor="priority" className="text-sm font-medium text-slate-300">
              Priority
            </label>
            <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
              <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white focus:border-blue-500">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="low" className="text-white hover:bg-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    Low
                  </div>
                </SelectItem>
                <SelectItem value="medium" className="text-white hover:bg-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    Medium
                  </div>
                </SelectItem>
                <SelectItem value="high" className="text-white hover:bg-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    High
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Expiration Date */}
          <div className="space-y-2">
            <label htmlFor="expires_at" className="text-sm font-medium text-slate-300">
              Expiration Date (Optional)
            </label>
            <Input
              id="expires_at"
              type="datetime-local"
              value={formData.expires_at}
              onChange={(e) => handleInputChange("expires_at", e.target.value)}
              className="bg-slate-700/50 border-slate-600 text-white focus:border-blue-500"
            />
          </div>

          {/* File Attachments */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              Attachments (Optional)
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={uploadingFiles}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  Add Files
                </Button>
                <span className="text-xs text-slate-400">
                  Max 10MB per file. Images, PDFs, documents allowed.
                </span>
              </div>
              
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-700/30 rounded border border-slate-600">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-slate-300 truncate">{file.name}</p>
                          <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || !formData.title.trim() || !formData.content.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Announcement
                </div>
              )}
            </Button>
            {onCancel && (
              <Button
                type="button"
                onClick={onCancel}
                variant="outline"
                className="px-6 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}