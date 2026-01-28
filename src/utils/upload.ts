import { supabase } from '../integrations/supabase/client';

export async function uploadFile(file: File, folderName?: string): Promise<string> {
  // 1. Explicitly get the current session to ensure we have a valid token
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('User not authenticated. Please log in to upload files.');
  }

  // 2. Pass the token explicitly in the headers
  const { data, error } = await supabase.functions.invoke('generate-upload-url', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: {
      fileName: file.name,
      contentType: file.type,
      folderName,
    },
  });

  if (error) {
    // Log the actual error for debugging
    console.error('Upload URL generation failed:', error);
    throw new Error(`Failed to generate upload URL: ${error.message || 'Unknown error'}`);
  }

  const { uploadUrl, key } = data;

  // 3. Perform the actual upload to S3
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to upload file: ${res.statusText}`);
  }

  return key;
}

export async function deleteFiles(fileKeys: string[]): Promise<void> {
  if (fileKeys.length === 0) return;

  // Ideally, apply the same fix here for deleteFiles if it requires auth
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers = session ? { Authorization: `Bearer ${session.access_token}` } : undefined;

  const { error } = await supabase.functions.invoke('delete-file', {
    headers,
    body: {
      fileKeys,
    },
  });

  if (error) {
    throw new Error(`Failed to delete files: ${error.message}`);
  }
}
