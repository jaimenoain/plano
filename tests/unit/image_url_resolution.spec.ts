import { test, expect } from '@playwright/test';
import { getBuildingImageUrl } from '../../src/utils/image';

test.describe('getBuildingImageUrl', () => {
  // Save original env
  const originalEnv = process.env;

  test.beforeEach(() => {
    // Reset env before each test
    process.env = { ...originalEnv };
    // Clear relevant env vars
    delete process.env.VITE_PUBLIC_STORAGE_URL;
    delete process.env.VITE_SUPABASE_URL;
  });

  test.afterAll(() => {
    process.env = originalEnv;
  });

  test('returns undefined for null/undefined input', () => {
    expect(getBuildingImageUrl(null)).toBeUndefined();
    expect(getBuildingImageUrl(undefined)).toBeUndefined();
    expect(getBuildingImageUrl('')).toBeUndefined();
  });

  test('returns full URL as-is', () => {
    const url = 'https://example.com/image.jpg';
    expect(getBuildingImageUrl(url)).toBe(url);
    const blob = 'blob:http://localhost:3000/xyz';
    expect(getBuildingImageUrl(blob)).toBe(blob);
  });

  test('constructs URL using VITE_PUBLIC_STORAGE_URL if defined', () => {
    process.env.VITE_PUBLIC_STORAGE_URL = 'https://my-s3.com/bucket';
    const path = 'folder/image.jpg';
    // Note: The function implementation will need to handle reading process.env for this test to pass
    // if running in Node environment.
    expect(getBuildingImageUrl(path)).toBe('https://my-s3.com/bucket/folder/image.jpg');
  });

  test('fallback to VITE_SUPABASE_URL if storage url is missing', () => {
    process.env.VITE_SUPABASE_URL = 'https://project.supabase.co';
    const path = 'folder/image.jpg';
    const expected = 'https://project.supabase.co/storage/v1/object/public/review_images/folder/image.jpg';
    expect(getBuildingImageUrl(path)).toBe(expected);
  });

  test('handles slashes correctly', () => {
    process.env.VITE_PUBLIC_STORAGE_URL = 'https://my-s3.com/bucket/'; // trailing slash
    const path = '/folder/image.jpg'; // leading slash
    expect(getBuildingImageUrl(path)).toBe('https://my-s3.com/bucket/folder/image.jpg');
  });

  test('encodes path correctly', () => {
    process.env.VITE_PUBLIC_STORAGE_URL = 'https://my-s3.com/bucket';
    const path = 'folder/my image.jpg';
    expect(getBuildingImageUrl(path)).toBe('https://my-s3.com/bucket/folder/my%20image.jpg');
  });
});
