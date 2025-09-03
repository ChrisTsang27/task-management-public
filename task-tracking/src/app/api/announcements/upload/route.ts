import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt', 'doc', 'docx'];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = [];
    const uploadedUrls = [];

    // Extract all files from FormData
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file_') && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Validate files
    for (const file of files) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File ${file.name} is too large. Maximum size is 10MB.` },
          { status: 400 }
        );
      }

      // Check file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File type ${file.type} is not allowed for ${file.name}.` },
          { status: 400 }
        );
      }

      // Check file extension
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
        return NextResponse.json(
          { error: `File extension .${fileExt} is not allowed for ${file.name}.` },
          { status: 400 }
        );
      }
    }

    // Upload each file to Supabase Storage
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `announcements/${fileName}`;

      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('attachments')
        .upload(filePath, uint8Array, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json(
          { error: `Failed to upload file: ${file.name}` },
          { status: 500 }
        );
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      uploadedUrls.push({
        url: String(urlData.publicUrl),
        name: String(file.name),
        size: Number(file.size),
        type: String(file.type),
        path: String(filePath),
      });
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      count: uploadedUrls.length,
    });
  } catch (error) {
    console.error('Error in file upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}