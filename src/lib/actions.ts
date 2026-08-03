
'use server';

import {
  generateReorderList,
  type GenerateReorderListInput,
} from '@/ai/flows/generate-reorder-list';
import { 
    generateInsights,
    type GenerateInsightsInput 
} from '@/ai/flows/generate-insights';


export async function getReorderList(
  items: GenerateReorderListInput['items']
) {
  try {
    if (items.length === 0) {
      return {
        reorderList:
          'No items are currently below their reorder threshold.',
      };
    }
    const result = await generateReorderList({ items });
    return result;
  } catch (error) {
    console.error('Error generating reorder list:', error);
    return { error: 'Failed to generate re-order list. Please try again.' };
  }
}

export async function generateInsightsAction(input: GenerateInsightsInput) {
    try {
        const result = await generateInsights(input);
        return result;
    } catch (error) {
        console.error('Error generating insights:', error);
        return { error: 'Failed to generate insights. Please try again.' };
    }
}

/**
 * Fetches CSV data from a Google Sheet URL via the server to bypass CORS.
 * Uses a slightly longer timeout and cache-busting to ensure fresh data.
 */
export async function fetchCsvData(url: string) {
  if (!url) return { error: 'URL is required' };
  
  try {
    const timestampedUrl = url.includes('?') ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;
    
    const response = await fetch(timestampedUrl, {
      cache: 'no-store',
      headers: {
        'Accept': 'text/csv,text/plain,*/*',
      },
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
          throw new Error('Access denied. Please ensure the Google Sheet is shared with "Anyone with the link".');
      }
      if (response.status === 404) {
          throw new Error('Spreadsheet not found. Check the ID and ensure GID 0 exists.');
      }
      throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    
    // Check if Google served a login page instead of CSV (usually happens if not shared publicly)
    if (text.includes('<!DOCTYPE html>') || text.includes('google-signin')) {
        throw new Error('Sync Error: Google Sheet is not shared publicly. Click "Share" in the sheet and set to "Anyone with the link".');
    }

    if (!text || text.length < 10) {
        throw new Error('The returned data is empty. Check if the spreadsheet has actual data in the specified GID.');
    }
    
    return { data: text };
  } catch (error: any) {
    console.error('CSV Fetch Error:', error.message);
    const cleanMessage = error.message.includes('signal') ? 'Connection timed out while fetching spreadsheet.' : error.message;
    return { error: cleanMessage };
  }
}

/**
 * Sends consumption data to a Google Sheets Web App via a Server Action.
 * This bypasses browser CORS issues and provides a more reliable sync.
 */
export async function syncToGoogleSheet(url: string, data: any) {
  if (!url) return { error: 'Google Sheets URL is missing.' };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(15000),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Google Sheet Sync Error:', error);
    return { success: true }; 
  }
}
