import { supabase } from '../integrations/supabase/client';

export async function uploadFile(file: File, folderName?: string): Promise<string> {
  // 1. Ensure we have a valid session. getUser() verifies the token with the server.
  const { error: userError } = await supabase.auth.getUser();

  if (userError) {
    // If getUser fails (e.g. token expired), try to refresh the session explicitly
    const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError || !session) {
      throw new Error('User not authenticated. Please log in to upload files.');
    }
  }

  // 2. Invoke the function (Auth header is automatically added by supabase-js)
  const { data, error } = await supabase.functions.invoke('generate-upload-url', {
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

  const { error } = await supabase.functions.invoke('delete-file', {
    body: {
      fileKeys,
    },
  });

  if (error) {
    throw new Error(`Failed to delete files: ${error.message}`);
  }
}
