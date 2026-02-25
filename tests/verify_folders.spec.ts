import { test, expect } from '@playwright/test';

test.describe('Verify Folders Feature', () => {
  const username = 'testuser';
  const userId = 'user-1';

  test.beforeEach(async ({ page }) => {
    // 1. Mock Auth User
    await page.route("**/auth/v1/user", async (route) => {
      await route.fulfill({
        json: {
          id: userId,
          aud: "authenticated",
          role: "authenticated",
          email: "test@example.com",
          app_metadata: { provider: "email", providers: ["email"] },
          user_metadata: {},
          created_at: "2023-01-01T00:00:00.000000Z",
          updated_at: "2023-01-01T00:00:00.000000Z"
        }
      });
    });

    // 2. Mock Profile
    await page.route("**/rest/v1/profiles*", async (route) => {
      await route.fulfill({
        json: {
          id: userId,
          username: username,
          full_name: "Test User",
          avatar_url: null,
          website: null,
          bio: "Test Bio"
        }
      });
    });

    // 3. Mock Collections (Initial State: 2 Collections)
    await page.route("**/rest/v1/collections*", async (route) => {
      if (route.request().url().includes("collection_contributors") || route.request().url().includes("collection_favorites")) {
          await route.fulfill({ json: [] });
          return;
      }

      // If querying by ID (e.g. for folder items), return specific collection
      if (route.request().url().includes("id=eq.")) {
          await route.fulfill({
            json: [
                {
                    id: "col-1",
                    name: "Paris Trip",
                    slug: "paris-trip",
                    is_public: true,
                    created_at: "2023-01-01T00:00:00+00:00",
                    owner_id: userId,
                    collection_items: [{ count: 5 }],
                    owner: { username: username }
                }
            ]
          });
          return;
      }

      await route.fulfill({
        json: [
          {
            id: "col-1",
            name: "Paris Trip",
            slug: "paris-trip",
            is_public: true,
            created_at: "2023-01-01T00:00:00+00:00",
            owner_id: userId,
            collection_items: [{ count: 5 }],
            owner: { username: username }
          },
          {
            id: "col-2",
            name: "Tokyo Eats",
            slug: "tokyo-eats",
            is_public: false,
            created_at: "2023-02-01T00:00:00+00:00",
            owner_id: userId,
            collection_items: [{ count: 3 }],
            owner: { username: username }
          }
        ]
      });
    });

    // 4. Mock User Folders (Default Empty)
    await page.route("**/rest/v1/user_folders*", async (route) => {
        if (route.request().method() === 'POST') {
             const postData = route.request().postDataJSON();
             await route.fulfill({
                 status: 201,
                 json: {
                     ...postData,
                     id: "folder-new-1",
                     created_at: new Date().toISOString()
                 }
             });
             return;
        }

        if (route.request().method() === 'DELETE') {
            await route.fulfill({ status: 204 });
            return;
        }

        await route.fulfill({ json: [] });
    });

    // 5. Mock User Folder Items
    await page.route("**/rest/v1/user_folder_items*", async (route) => {
         await route.fulfill({ json: [] });
    });

    // 6. Set Local Storage for Session
    await page.addInitScript(() => {
      localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
        access_token: 'fake-jwt-token',
        refresh_token: 'fake-refresh-token',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          app_metadata: { provider: 'email' },
          user_metadata: {},
          aud: 'authenticated',
          created_at: '2023-01-01T00:00:00.000000Z'
        },
        expires_at: Math.floor(Date.now() / 1000) + 3600
      }));
    });
  });

  test('Test Case 1: Private Folder Access (RLS Frontend Handling)', async ({ page }) => {
    // Override folder mock to return null for a specific private folder
    await page.route("**/rest/v1/user_folders*", async (route) => {
        const url = route.request().url();
        if (url.includes("slug=eq.private-folder")) {
             await route.fulfill({ json: [] });
             return;
        }
        await route.fallback();
    });

    // Correct URL structure: /:username/folders/:slug
    await page.goto(`http://localhost:8080/${username}/folders/private-folder`);

    // Check for Unavailable UI
    await expect(page.getByText('Unavailable')).toBeVisible();
  });

  test('Test Case 2: Folder Creation & Adding Collection', async ({ page }) => {
    // 1. Initial Load
    await page.goto(`http://localhost:8080/profile/${username}`);
    await expect(page.getByText('Collections')).toBeVisible();

    let folders: any[] = [];
    let folderItems: any[] = [];

    // Override route for folders
    await page.route("**/rest/v1/user_folders*", async (route) => {
        if (route.request().method() === 'POST') {
             const postData = route.request().postDataJSON();
             const newFolder = {
                 ...postData,
                 id: "folder-new-1",
                 created_at: new Date().toISOString(),
                 items_count: [{ count: 0 }],
                 user_folder_items: []
             };
             folders = [newFolder];
             await route.fulfill({ status: 201, json: newFolder });
             return;
        }
        if (route.request().method() === 'GET') {
            await route.fulfill({ json: folders });
            return;
        }
        await route.fallback();
    });

    // Override route for folder items
    await page.route("**/rest/v1/user_folder_items*", async (route) => {
        if (route.request().method() === 'POST') {
            // Adding items
            const postData = route.request().postDataJSON(); // Array of items
            // Update local state (simplified)
            // Assuming postData is array
            if (Array.isArray(postData)) {
                folderItems = [...folderItems, ...postData];
            } else {
                folderItems.push(postData);
            }

            // Update folder count
            if (folders.length > 0) {
                folders[0].items_count = [{ count: folderItems.length }];
                // Mock image preview if collection has images
                // Assuming we added 'col-1' (Paris Trip) which has mock images from verify_manage_folders.py logic,
                // but here we just need to verify count update.
            }

            await route.fulfill({ status: 201, json: postData });
            return;
        }

        if (route.request().method() === 'GET') {
             // Return current items for the folder
             await route.fulfill({ json: folderItems });
             return;
        }
        await route.fallback();
    });

    // 2. Click Organize -> Create New Folder
    await page.getByRole('button', { name: 'Organize' }).click();
    await expect(page.getByText('Manage Folders')).toBeVisible();

    await page.getByRole('button', { name: 'Create New Folder' }).click();
    await page.getByLabel('Name').fill('My Trips');
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    // 3. Add Collection to Folder
    // Click on the newly created folder row to manage items
    await expect(page.getByText('Manage Folders')).toBeVisible();

    // Use role=dialog locator to disambiguate
    const dialog = page.locator('div[role="dialog"]');
    await dialog.getByText('My Trips').click();

    await expect(page.getByText('Manage My Trips')).toBeVisible();

    // Select "Paris Trip"
    await page.getByLabel('Paris Trip').check();

    // Save
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Verify toast or success
    // Wait for "Manage Folders" view to return
    await expect(page.getByText('Manage Folders')).toBeVisible();

    // Close dialog
    await page.keyboard.press('Escape');

    // 4. Verify Folder Appears with Count
    const folderCard = page.locator('a[href*="/folders/"]').filter({ hasText: 'My Trips' });
    await expect(folderCard).toBeVisible();

    // Verify count is 1
    // The component renders count: <span ...>{folder.items_count || 0}</span>
    // We can check if it contains text "1"
    await expect(folderCard).toContainText('1');
  });

  test('Test Case 3: Mobile Layout & Responsiveness', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Mock with folders
    await page.route("**/rest/v1/user_folders*", async (route) => {
        if (route.request().method() === 'GET') {
            await route.fulfill({ json: [
                {
                    id: "folder-1",
                    owner_id: userId,
                    name: "Mobile Folder 1",
                    slug: "mobile-folder-1",
                    is_public: true,
                    created_at: new Date().toISOString(),
                    items_count: [{ count: 2 }],
                    user_folder_items: [],
                    preview_images: []
                },
                {
                    id: "folder-2",
                    owner_id: userId,
                    name: "Mobile Folder 2",
                    slug: "mobile-folder-2",
                    is_public: true,
                    created_at: new Date().toISOString(),
                    items_count: [{ count: 0 }],
                    user_folder_items: [],
                    preview_images: []
                }
            ] });
            return;
        }
        await route.fallback();
    });

    await page.goto(`http://localhost:8080/profile/${username}`);

    await expect(page.getByRole('button', { name: 'Organize' })).toBeVisible();
    await expect(page.getByText('Mobile Folder 1')).toBeVisible();
    await expect(page.getByText('Mobile Folder 2')).toBeVisible();
  });

  test('Test Case 4: Deletion Logic (Frontend)', async ({ page }) => {
    // 1. Setup: Start with one folder
    let folders = [
        {
            id: "folder-del-1",
            owner_id: userId,
            name: "To Delete",
            slug: "to-delete",
            is_public: true,
            created_at: new Date().toISOString(),
            items_count: [{ count: 0 }],
            user_folder_items: []
        }
    ];

    await page.route("**/rest/v1/user_folders*", async (route) => {
        if (route.request().method() === 'DELETE') {
             folders = [];
             await route.fulfill({ status: 204 });
             return;
        }
        if (route.request().method() === 'GET') {
            await route.fulfill({ json: folders });
            return;
        }
        await route.fallback();
    });

    await page.goto(`http://localhost:8080/profile/${username}`);
    await expect(page.getByText('To Delete')).toBeVisible();

    // 2. Delete Folder
    await page.getByRole('button', { name: 'Organize' }).click();

    // Find the row and click delete (trash icon)
    // Using CSS class selector based on component source "text-destructive/80"
    const deleteIcon = page.locator('.text-destructive\\/80');
    await deleteIcon.click();

    // Confirm deletion in AlertDialog
    await expect(page.getByText('Delete Folder?')).toBeVisible();
    await page.getByRole('button', { name: 'Delete' }).click();

    // 3. Verify Folder is Gone
    // Wait for list to update in dialog (or "No folders found")
    await expect(page.getByText('No folders found')).toBeVisible();

    // Close dialog
    await page.keyboard.press('Escape');

    // Verify on profile page
    await expect(page.getByText('To Delete')).not.toBeVisible();

    // 4. Verify Collections still exist (Paris Trip)
    await expect(page.getByText('Paris Trip')).toBeVisible();
  });

});
