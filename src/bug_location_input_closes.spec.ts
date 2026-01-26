import { test, expect } from '@playwright/test';

test('Location input should not close on typing', async ({ page }) => {
  // Mock Google Maps API
  await page.addInitScript(() => {
    window.google = {
      maps: {
        places: {
          AutocompleteService: class {
            getPlacePredictions(request: any, callback: any) {
              callback([{ description: 'New York', place_id: '1', structured_formatting: { main_text: 'New York' } }], 'OK');
            }
          },
          PlacesService: class {
            getDetails(request: any, callback: any) {
              callback({ address_components: [{ types: ['country'], short_name: 'US' }] }, 'OK');
            }
          }
        },
        Geocoder: class {
          geocode(request: any, callback: any) {
            callback([{ address_components: [{ types: ['country'], short_name: 'US' }], geometry: { location: { lat: () => 0, lng: () => 0 }, viewport: { getNorthEast: () => ({ lat: 0, lng: 0 }), getSouthWest: () => ({ lat: 0, lng: 0 }) } } }], 'OK');
          }
        }
      }
    } as any;
  });

  await page.goto('http://localhost:8080/search');

  // Wait for the filter bar
  const filterBar = page.locator('.sticky.top-0');
  await expect(filterBar).toBeVisible();

  // Click Location button (MapPin)
  // We look for a button that contains the MapPin icon
  const locationBtn = page.locator('button').filter({ has: page.locator('svg.lucide-map-pin') }).first();
  await expect(locationBtn).toBeVisible();
  await locationBtn.click();

  // Check Dialog is open
  const dialog = page.locator('div[role="dialog"]');
  await expect(dialog).toBeVisible();

  // Find Input
  // The input has placeholder "City, Region or Country..."
  const input = dialog.locator('input').first();
  await expect(input).toBeVisible();

  // Type 'a'
  await input.type('a');

  // Wait for potential closing (the bug)
  await page.waitForTimeout(500);

  // Assert Dialog is STILL visible
  await expect(dialog).toBeVisible();
  await expect(input).toBeVisible();
  // Assert value is 'a'
  await expect(input).toHaveValue('a');

  await page.screenshot({ path: 'verification_location_fix.png' });
});
