/**
 * This file allows us to directly import the JSON data at build time
 * as a fallback if the file can't be loaded at runtime
 */

// Use a dynamic import to load the JSON data
// This is more reliable as it gets bundled with the app
export async function loadStantonData(): Promise<Record<string, any>> {
  try {
    // Use a relative path from this file to the JSON
    const jsonData = await import('../stanton_extract.json');
    return jsonData.default || jsonData;
  } catch (error) {
    console.error('Failed to import JSON data:', error);
    throw error;
  }
} 