import { supabase } from '../integrations/supabase/client';

export async function uploadFile(file: File, folderName?: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-upload-url', {
    body: {
      fileName: file.name,
      contentType: file.type,
      folderName,
    },
  });

  if (error) {
    throw new Error(`Failed to generate upload URL: ${error.message}`);
  }

  const { uploadUrl, key } = data;

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
