import { supabase } from '../integrations/supabase/client';

export async function uploadFile(file: File, folderName?: string): Promise<string> {
  // 1. Explicitly get the current session to ensure we have a valid token
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('User not authenticated. Please log in to upload files.');
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

export async function uploadFileWithProgress(
  file: File,
  onProgress?: (progress: number) => void,
  folderName?: string
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('User not authenticated. Please log in to upload files.');
  }

  const { data, error } = await supabase.functions.invoke('generate-upload-url', {
    body: {
      fileName: file.name,
      contentType: file.type,
      folderName,
    },
  });

  if (error) {
    console.error('Upload URL generation failed:', error);
    throw new Error(`Failed to generate upload URL: ${error.message || 'Unknown error'}`);
  }

  const { uploadUrl, key } = data;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(percentComplete);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(key);
      } else {
        reject(new Error(`Failed to upload file: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during file upload'));
    };

    xhr.send(file);
  });
}

export async function deleteFiles(fileKeys: string[]): Promise<void> {
  if (fileKeys.length === 0) return;

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('User not authenticated. Please log in to delete files.');
  }

  const { error } = await supabase.functions.invoke('delete-file', {
    body: {
      fileKeys,
    },
  });

  if (error) {
    throw new Error(`Failed to delete files: ${error.message}`);
  }
}
