"use client";

import React, { useState, useCallback } from 'react';

import ExcelJS from 'exceljs';
import { Upload, Download, Users, AlertCircle, CheckCircle, X } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import supabase from '@/lib/supabaseBrowserClient';

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
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a file first',
        variant: 'destructive'
      });
      return;
    }
    
    console.log('🚀 Starting upload process');
    console.log('📁 File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });
    
    setUploading(true);
    setProgress(0);
    setResult(null);
    
    try {
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required. Please sign in again.');
      }
      console.log('✅ Authentication token obtained');

      const formData = new FormData();
      formData.append('file', file);
      console.log('📤 FormData created, making API call...');
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const response = await fetch('/api/admin/bulk-import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      console.log('📥 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      clearInterval(progressInterval);
      setProgress(100);
      
      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Error response text:', errorText);
        let errorMessage = `Upload failed (${response.status})`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = errorText || `Upload failed (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      let data;
      try {
        data = await response.json();
        console.log('✅ Success response:', data);
      } catch (parseError) {
        console.error('Failed to parse response JSON:', parseError);
        throw new Error('Invalid response from server');
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
      console.error('❌ Upload error details:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Keep progress bar visible for a moment to show the error state
      setProgress(100);
      
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      });
      
      // Delay hiding the progress bar to show error state
      setTimeout(() => {
        setProgress(0);
      }, 2000);
    } finally {
      setUploading(false);
      console.log('🏁 Upload process completed');
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
      
      // Add data validation for dropdown lists using range-based approach
      // This ensures dropdowns work for all rows, not just existing ones
      // Note: Using type assertion due to missing TypeScript definitions in ExcelJS 4.4.0
      
      // Title dropdown (column C) - apply to rows 2-1000
      (worksheet as any).dataValidations.add('C2:C1000', {
        type: 'list',
        allowBlank: true,
        formulae: [`"${titleOptions.join(',')}"`],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Invalid Title',
        error: `Please select from: ${titleOptions.join(', ')}`
      });
      
      // Department dropdown (column D) - apply to rows 2-1000
      (worksheet as any).dataValidations.add('D2:D1000', {
        type: 'list',
        allowBlank: true,
        formulae: [`"${departmentOptions.join(',')}"`],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Invalid Department',
        error: `Please select from: ${departmentOptions.join(', ')}`
      });
      
      // Location dropdown (column E) - apply to rows 2-1000
      (worksheet as any).dataValidations.add('E2:E1000', {
        type: 'list',
        allowBlank: true,
        formulae: [`"${locationOptions.join(',')}"`],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Invalid Location',
        error: `Please select from: ${locationOptions.join(', ')}`
      });
      
      // Role dropdown (column F) - apply to rows 2-1000
      (worksheet as any).dataValidations.add('F2:F1000', {
        type: 'list',
        allowBlank: true,
        formulae: [`"${roleOptions.join(',')}"`],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Invalid Role',
        error: `Please select from: ${roleOptions.join(', ')}`
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
      instructionsSheet.addRow(['2. Click on cells in Title, Department, Location, and Role columns to see dropdown options']);
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
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-100">
          <Users className="h-5 w-5" />
          Bulk User Import
        </CardTitle>
        <CardDescription className="text-slate-400">
          Upload a CSV or Excel file to import multiple users at once. Only admins can access this feature.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Download */}
        <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg border border-slate-600">
          <div>
            <h4 className="font-medium text-slate-200">Need a template?</h4>
            <p className="text-sm text-slate-300">Download our template with the required columns</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => downloadTemplate('csv')}
              className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 hover:border-slate-400 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              CSV Template
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => downloadTemplate('excel')}
              className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 hover:border-slate-400 transition-colors"
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
              ? 'border-blue-400 bg-slate-700'
              : file
              ? 'border-green-400 bg-slate-700'
              : 'border-slate-600 hover:border-blue-400 hover:bg-slate-700 hover:shadow-md'
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
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto" />
              <div>
                <p className="font-medium text-green-300">{file.name}</p>
                <p className="text-sm text-green-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFile}
                className="text-red-400 hover:text-red-300 hover:bg-slate-600 transition-colors"
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-12 w-12 text-slate-400 mx-auto" />
              <div>
                <p className="text-lg font-medium text-slate-300">
                  {dragActive ? 'Drop your file here' : 'Drag & drop your file here'}
                </p>
                <p className="text-sm text-slate-400">
                  or click to browse • CSV, XLSX, XLS files only • Max 10MB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-300">
              <span>Uploading and processing...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full bg-slate-700" />
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              )}
              <h4 className="font-medium text-slate-200">
                Import {result.success ? 'Completed' : 'Completed with Issues'}
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-700 rounded-lg border border-slate-600">
                <div className="text-2xl font-bold text-green-400">{result.imported}</div>
                <div className="text-sm text-slate-300">Users Imported</div>
              </div>
              
              {result.duplicates.length > 0 && (
                <div className="text-center p-4 bg-slate-700 rounded-lg border border-slate-600">
                  <div className="text-2xl font-bold text-yellow-400">{result.duplicates.length}</div>
                  <div className="text-sm text-slate-300">Duplicates Skipped</div>
                </div>
              )}
              
              {result.errors.length > 0 && (
                <div className="text-center p-4 bg-slate-700 rounded-lg border border-slate-600">
                  <div className="text-2xl font-bold text-red-400">{result.errors.length}</div>
                  <div className="text-sm text-slate-300">Errors</div>
                </div>
              )}
            </div>

            {/* Duplicates */}
            {result.duplicates.length > 0 && (
              <Alert className="bg-slate-700 border-slate-600">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-slate-300">
                  <strong className="text-yellow-400">Duplicate emails skipped:</strong>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {result.duplicates.map((email, index) => (
                      <Badge key={index} variant="secondary" className="text-xs bg-slate-600 text-slate-200">
                        {email}
                      </Badge>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Errors */}
            {result.errors.length > 0 && (
              <Alert variant="destructive" className="bg-red-900/20 border-red-800">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-slate-300">
                  <strong className="text-red-400">Errors encountered:</strong>
                  <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                    {result.errors.slice(0, 10).map((error, index) => (
                      <li key={index} className="text-slate-300">{error}</li>
                    ))}
                    {result.errors.length > 10 && (
                      <li className="text-slate-400">... and {result.errors.length - 10} more errors</li>
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