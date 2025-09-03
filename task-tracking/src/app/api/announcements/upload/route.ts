import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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