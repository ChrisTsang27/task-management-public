"use client";

import React, { useState, useCallback } from 'react';
import { Upload, Download, Users, AlertCircle, CheckCircle, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

import { Button } from '@/components/ui/button';
import supabase from '@/lib/supabaseBrowserClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  duplicates: string[];
}

interface BulkUserImportProps {
  onImportComplete?: () => void;
}

export default function BulkUserImport({ onImportComplete }: BulkUserImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  }, []);

  const validateAndSetFile = (selectedFile: File) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['csv', 'xlsx', 'xls'];
    
    if (!allowedTypes.includes(selectedFile.type) && !validExtensions.includes(fileExtension || '')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a CSV or Excel file (.csv, .xlsx, .xls)',
        variant: 'destructive'
      });
      return;
    }
    
    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: 'File too large',
        description: 'Please select a file smaller than 10MB',
        variant: 'destructive'
      });
      return;
    }
    
    setFile(selectedFile);
    setResult(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setProgress(0);
    setResult(null);
    
    try {
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required. Please sign in again.');
      }

      const formData = new FormData();
      formData.append('file', file);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const response = await fetch('/api/admin/bulk-import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData
      });
      
      clearInterval(progressInterval);
      setProgress(100);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }
      
      setResult(data);
      
      if (data.success) {
        toast({
          title: 'Import completed',
          description: `Successfully imported ${data.imported} users`,
        });
        onImportComplete?.();
      } else {
        toast({
          title: 'Import completed with issues',
          description: `Imported ${data.imported} users with some errors`,
          variant: 'destructive'
        });
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const downloadTemplate = (format: 'csv' | 'excel' = 'csv') => {
    if (format === 'csv') {
      const csvContent = `email,full_name,title,department,location,role,team_id
user@example.com,John Doe,Officer,Sales,SGI Coopers Plains,member,
admin@example.com,Jane Admin,Manager,IT,SGI Melbourne,admin,

# FIELD LIMITATIONS:
# title: Manager, Senior Officer, Team Leader, Officer, Assistant, Coordinator, Specialist, Analyst, Executive, Other
# department: Sales, Marketing, Administration, HR, IT, Finance, Operations, Customer Service
# location: SGI Coopers Plains, SGI Brendale, SGI Gold Coast, SGI Toowoomba, SGI Melbourne, KAYO Coopers Plains
# role: admin, member`;
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'user_import_template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } else {
      // Create Excel template with ExcelJS for proper dropdown validation
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Users');
      
      // Define allowed values
      const titleOptions = ['Manager', 'Senior Officer', 'Team Leader', 'Officer', 'Assistant', 'Coordinator', 'Specialist', 'Analyst', 'Executive', 'Other'];
      const departmentOptions = ['Sales', 'Marketing', 'Administration', 'HR', 'IT', 'Finance', 'Operations', 'Customer Service'];
      const locationOptions = ['SGI Coopers Plains', 'SGI Brendale', 'SGI Gold Coast', 'SGI Toowoomba', 'SGI Melbourne', 'KAYO Coopers Plains'];
      const roleOptions = ['admin', 'member'];
      
      // Add headers
      worksheet.addRow(['email', 'full_name', 'title', 'department', 'location', 'role', 'team_id']);
      
      // Add sample data
      worksheet.addRow(['user@example.com', 'John Doe', 'Officer', 'Sales', 'SGI Coopers Plains', 'member', '']);
      worksheet.addRow(['admin@example.com', 'Jane Admin', 'Manager', 'IT', 'SGI Melbourne', 'admin', '']);
      
      // Set column widths
      worksheet.getColumn(1).width = 25; // email
      worksheet.getColumn(2).width = 20; // full_name
      worksheet.getColumn(3).width = 15; // title
      worksheet.getColumn(4).width = 15; // department
      worksheet.getColumn(5).width = 20; // location
      worksheet.getColumn(6).width = 10; // role
      worksheet.getColumn(7).width = 10; // team_id
      
      // Add data validation for dropdown lists (rows 2-1000)
      // Title column (C)
      worksheet.dataValidations.add('C2:C1000', {
        type: 'list',
        allowBlank: true,
        formulae: [`"${titleOptions.join(',')}"`],
        showErrorMessage: true,
        errorTitle: 'Invalid Title',
        error: 'Please select a valid title from the dropdown list.'
      });
      
      // Department column (D)
      worksheet.dataValidations.add('D2:D1000', {
        type: 'list',
        allowBlank: true,
        formulae: [`"${departmentOptions.join(',')}"`],
        showErrorMessage: true,
        errorTitle: 'Invalid Department',
        error: 'Please select a valid department from the dropdown list.'
      });
      
      // Location column (E)
      worksheet.dataValidations.add('E2:E1000', {
        type: 'list',
        allowBlank: true,
        formulae: [`"${locationOptions.join(',')}"`],
        showErrorMessage: true,
        errorTitle: 'Invalid Location',
        error: 'Please select a valid location from the dropdown list.'
      });
      
      // Role column (F)
      worksheet.dataValidations.add('F2:F1000', {
        type: 'list',
        allowBlank: true,
        formulae: [`"${roleOptions.join(',')}"`],
        showErrorMessage: true,
        errorTitle: 'Invalid Role',
        error: 'Please select a valid role from the dropdown list.'
      });
      
      // Style the header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6E6FA' }
      };
      
      // Add instructions sheet
      const instructionsSheet = workbook.addWorksheet('Instructions');
      instructionsSheet.addRow(['BULK USER IMPORT INSTRUCTIONS']);
      instructionsSheet.addRow([]);
      instructionsSheet.addRow(['1. Fill in user data in the "Users" sheet starting from row 2']);
      instructionsSheet.addRow(['2. Use the dropdown lists for Title, Department, Location, and Role']);
      instructionsSheet.addRow(['3. Email must be unique and in valid format']);
      instructionsSheet.addRow(['4. Full name is required for all users']);
      instructionsSheet.addRow(['5. Leave team_id empty - users can be assigned to teams later via admin panel']);
      instructionsSheet.addRow(['6. Team assignment is optional during bulk import']);
      instructionsSheet.addRow([]);
      instructionsSheet.addRow(['ALLOWED VALUES:']);
      instructionsSheet.addRow(['Title:', titleOptions.join(', ')]);
      instructionsSheet.addRow(['Department:', departmentOptions.join(', ')]);
      instructionsSheet.addRow(['Location:', locationOptions.join(', ')]);
      instructionsSheet.addRow(['Role:', roleOptions.join(', ')]);
      instructionsSheet.addRow([]);
      instructionsSheet.addRow(['TEAM ASSIGNMENT:']);
      instructionsSheet.addRow(['- Leave team_id column empty for most imports']);
      instructionsSheet.addRow(['- Users can be assigned to teams after import via admin panel']);
      instructionsSheet.addRow(['- If you need specific team IDs, contact your system administrator']);
      
      // Style instructions sheet
      instructionsSheet.getColumn(1).width = 15;
      instructionsSheet.getColumn(2).width = 80;
      const titleRow = instructionsSheet.getRow(1);
      titleRow.font = { bold: true, size: 14 };
      
      // Generate and download the file
      workbook.xlsx.writeBuffer().then((buffer) => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'user_import_template.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      });
    }
  };

  const clearFile = () => {
    setFile(null);
    setResult(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Bulk User Import
        </CardTitle>
        <CardDescription>
          Upload a CSV or Excel file to import multiple users at once. Only admins can access this feature.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Download */}
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div>
            <h4 className="font-medium text-blue-900">Need a template?</h4>
            <p className="text-sm text-blue-700">Download our template with the required columns</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => downloadTemplate('csv')}
              className="hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              CSV Template
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => downloadTemplate('excel')}
              className="hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Excel Template
            </Button>
          </div>
        </div>

        {/* File Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
            dragActive
              ? 'border-blue-400 bg-blue-50'
              : file
              ? 'border-green-400 bg-green-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-md'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />
          
          {file ? (
            <div className="space-y-2">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <p className="font-medium text-green-700">{file.name}</p>
                <p className="text-sm text-green-600">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFile}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-12 w-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-lg font-medium text-gray-700">
                  {dragActive ? 'Drop your file here' : 'Drag & drop your file here'}
                </p>
                <p className="text-sm text-gray-500">
                  or click to browse • CSV, XLSX, XLS files only • Max 10MB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading and processing...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full"
          size="lg"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Import Users
            </>
          )}
        </Button>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              <h4 className="font-medium">
                Import {result.success ? 'Completed' : 'Completed with Issues'}
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{result.imported}</div>
                <div className="text-sm text-green-700">Users Imported</div>
              </div>
              
              {result.duplicates.length > 0 && (
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{result.duplicates.length}</div>
                  <div className="text-sm text-yellow-700">Duplicates Skipped</div>
                </div>
              )}
              
              {result.errors.length > 0 && (
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{result.errors.length}</div>
                  <div className="text-sm text-red-700">Errors</div>
                </div>
              )}
            </div>

            {/* Duplicates */}
            {result.duplicates.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Duplicate emails skipped:</strong>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {result.duplicates.map((email, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {email}
                      </Badge>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Errors */}
            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Errors encountered:</strong>
                  <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                    {result.errors.slice(0, 10).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {result.errors.length > 10 && (
                      <li className="text-gray-600">... and {result.errors.length - 10} more errors</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}