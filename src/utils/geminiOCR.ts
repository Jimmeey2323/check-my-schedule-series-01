/**
 * Advanced OCR using Google Gemini Vision API
 * This provides significantly better accuracy than Tesseract.js for structured data extraction
 */

import { PdfClassData } from '@/types/schedule';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('⚠️ VITE_GEMINI_API_KEY not set. PDF parsing will use fallback methods.');
}

// Use Gemini 2.0 Flash for vision tasks - it's fast and supports multimodal
const GEMINI_VISION_MODEL = 'gemini-2.0-flash';

interface GeminiExtractedClass {
  day: string;
  time: string;
  className: string;
  trainer: string;
  theme?: string;
}

interface GeminiExtractionResult {
  success: boolean;
  classes: GeminiExtractedClass[];
  rawText: string;
  error?: string;
}

/**
 * Convert a PDF page to a high-quality image for Gemini Vision
 */
async function pdfPageToImage(file: File, pageNum: number, scale: number = 2.5): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(pageNum);
  
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    throw new Error('Failed to create canvas context');
  }
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  await page.render({
    canvasContext: context,
    viewport: viewport,
    canvas: canvas
  } as any).promise;
  
  // Convert to base64 JPEG for smaller payload (JPEG is more efficient than PNG)
  const base64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
  
  // Cleanup
  canvas.width = 1;
  canvas.height = 1;
  
  return base64;
}

/**
 * Extract schedule data from an image using Gemini Vision API
 */
async function extractScheduleWithGeminiVision(
  imageBase64: string,
  location: string,
  pageNum: number
): Promise<GeminiExtractionResult> {
  // Check if API key is available
  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is not set! Please add VITE_GEMINI_API_KEY to your .env file.');
    throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
  }
  
  console.log(`🔑 Using Gemini API key: ${GEMINI_API_KEY.substring(0, 10)}...`);
  
  const prompt = `You are an expert at extracting class schedule data from fitness studio schedule images.

Analyze this image of a fitness class schedule and extract ALL class entries.

IMPORTANT EXTRACTION RULES:
1. Extract EVERY class entry you can find, even if partially visible
2. The schedule is organized by days of the week (Monday through Sunday)
3. Each class entry typically has: Time, Class Name, and Trainer Name
4. Class names may include: Barre 57, Mat 57, PowerCycle, FIT, HIIT, Strength Lab, Cardio Barre, Back Body Blaze, Recovery, Foundations, SWEAT In 30, Amped Up!, etc.
5. EXPRESS CLASSES ARE VERY IMPORTANT - Look for classes with "EXPRESS" or "EXP" in the name like:
   - Cardio Barre Express
   - Mat 57 Express
   - Barre 57 Express
   - Back Body Blaze Express
   - PowerCycle Express
   - Any class followed by EXPRESS or EXP
6. Times are in 12-hour format (e.g., 7:30 AM, 5:00 PM)
7. Trainer names are usually first names or full names
8. Some classes may have themes like "SLAY SUNDAY", "GLUTES GALORE", "BATTLE OF THE BANDS", etc.
9. The schedule may have columns for different days side by side
10. OCR might have errors - use context to fix obvious mistakes:
   - "MATS7" or "MAT S7" should be "Mat 57"
   - "BARRES7" or "BARRE S7" should be "Barre 57"  
   - "FT" or "F IT" should be "FIT"
   - "powerCycle" should be "PowerCycle"
   - Time like "730AM" should be "7:30 AM"
   - "EXP" or "EXPR" should be "Express"

Return a JSON object with this EXACT structure:
{
  "classes": [
    {
      "day": "Monday",
      "time": "7:30 AM",
      "className": "Barre 57",
      "trainer": "Anisha Shah",
      "theme": null
    }
  ],
  "rawText": "Raw text visible in the image"
}

If a class has a theme, include it. Otherwise use null for theme.
Ensure day names are capitalized properly: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.
Ensure times are formatted as "H:MM AM" or "H:MM PM" (e.g., "7:30 AM", "10:00 AM", "5:45 PM").
Add "Studio " prefix to class names if not present (e.g., "Barre 57" becomes "Studio Barre 57").
ALWAYS include "Express" in class names where it appears (e.g., "Mat 57 Express" not just "Mat 57").

Extract ALL classes visible in the image. Be thorough.`;

  // Retry logic for network issues
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Page ${pageNum}: Attempt ${attempt}/${maxRetries}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_VISION_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageBase64
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 32768,
              responseMimeType: 'application/json'
            }
          }),
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini Vision API error:', response.status, errorText);
        
        // Check for rate limiting (429) or server errors (5xx)
        if (response.status === 429 || response.status >= 500) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`Rate limited or server error. Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        throw new Error(`Gemini API error: ${response.status}`);
      }

    const result = await response.json();
    
    // Log token usage
    const usageMetadata = result.usageMetadata;
    if (usageMetadata) {
      console.log(`📊 Page ${pageNum} Token Usage:`);
      console.log(`   • Prompt tokens: ${usageMetadata.promptTokenCount?.toLocaleString() || 'N/A'}`);
      console.log(`   • Response tokens: ${usageMetadata.candidatesTokenCount?.toLocaleString() || 'N/A'}`);
      console.log(`   • Total tokens: ${usageMetadata.totalTokenCount?.toLocaleString() || 'N/A'}`);
      console.log(`   ℹ️ Free tier: 1,500 requests/day, 1M tokens/minute`);
    }
    
    console.log(`Page ${pageNum} Gemini response:`, result);

    // Extract the text content from the response
    const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) {
      console.warn(`No text content in Gemini response for page ${pageNum}`);
      return {
        success: false,
        classes: [],
        rawText: '',
        error: 'No content in Gemini response'
      };
    }

    // Parse the JSON response
    let parsedData;
    try {
      // Handle potential markdown code block wrapping
      let jsonStr = textContent.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      }
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
      parsedData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.warn('Initial JSON parse failed, attempting to recover truncated data...');
      
      // Try to recover partial data from truncated JSON
      let jsonStr = textContent.trim();
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
      
      // Method 1: Use regex to extract complete class objects
      const classRegex = /\{\s*"day"\s*:\s*"([^"]+)"\s*,\s*"time"\s*:\s*"([^"]+)"\s*,\s*"className"\s*:\s*"([^"]+)"\s*,\s*"trainer"\s*:\s*"([^"]+)"\s*,\s*"theme"\s*:\s*(null|"[^"]*")\s*\}/g;
      const matches = [...jsonStr.matchAll(classRegex)];
      
      if (matches.length > 0) {
        parsedData = {
          classes: matches.map(m => ({
            day: m[1],
            time: m[2],
            className: m[3],
            trainer: m[4],
            theme: m[5] === 'null' ? null : m[5]?.replace(/"/g, '')
          }))
        };
        console.log(`Regex extraction recovered ${parsedData.classes.length} classes from truncated response`);
      } else {
        // Method 2: Try to fix truncated JSON by closing brackets
        let fixedJson = jsonStr;
        
        // Remove any incomplete last object
        const lastCompleteObj = fixedJson.lastIndexOf('},');
        const lastObj = fixedJson.lastIndexOf('}');
        
        if (lastCompleteObj > 0 && lastCompleteObj < lastObj) {
          // There's an incomplete object at the end
          fixedJson = fixedJson.substring(0, lastCompleteObj + 1);
        } else if (lastObj > 0) {
          fixedJson = fixedJson.substring(0, lastObj + 1);
        }
        
        // Add missing closing brackets
        if (!fixedJson.includes(']}')) {
          fixedJson += ']}';
        } else if (!fixedJson.endsWith('}')) {
          fixedJson += '}';
        }
        
        try {
          parsedData = JSON.parse(fixedJson);
          console.log(`Fixed truncated JSON, recovered ${parsedData.classes?.length || 0} classes`);
        } catch (fixError) {
          console.error('Failed to recover truncated JSON:', textContent.substring(0, 500) + '...');
          return {
            success: false,
            classes: [],
            rawText: textContent,
            error: 'Failed to parse JSON response - data was truncated'
          };
        }
      }
    }

    const classes = (parsedData.classes || []).map((cls: any) => ({
      day: cls.day || '',
      time: normalizeTimeFormat(cls.time || ''),
      className: normalizeClassName(cls.className || ''),
      trainer: normalizeTrainerName(cls.trainer || ''),
      theme: cls.theme || undefined
    })).filter((cls: GeminiExtractedClass) => 
      cls.day && cls.time && cls.className && cls.trainer
    );

    console.log(`Page ${pageNum}: Extracted ${classes.length} classes via Gemini Vision`);
    
    return {
      success: true,
      classes,
      rawText: parsedData.rawText || textContent
    };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`Gemini Vision extraction error for page ${pageNum} (attempt ${attempt}):`, error);
      
      // If it's a network error, retry
      if (lastError.message.includes('Failed to fetch') || lastError.message.includes('network') || lastError.name === 'AbortError') {
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Network error. Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
      
      // For other errors, don't retry
      break;
    }
  }
  
  // All retries failed
  console.error(`Gemini Vision extraction failed for page ${pageNum} after ${maxRetries} attempts`);
  return {
    success: false,
    classes: [],
    rawText: '',
    error: lastError?.message || 'Unknown error'
  };
}

/**
 * Normalize time format to "H:MM AM/PM"
 */
function normalizeTimeFormat(time: string): string {
  if (!time) return '';
  
  let normalized = time.trim().toUpperCase();
  
  // Handle compact formats like "730AM" -> "7:30 AM"
  normalized = normalized.replace(/^(\d{1,2})(\d{2})(AM|PM)$/i, '$1:$2 $3');
  
  // Handle missing space before AM/PM
  normalized = normalized.replace(/(\d)(AM|PM)$/i, '$1 $2');
  
  // Handle dots instead of colons
  normalized = normalized.replace(/(\d)\.(\d)/g, '$1:$2');
  
  // Ensure proper spacing
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Validate and format
  const match = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const period = match[3].toUpperCase();
    
    // Validate hours
    if (hours > 12) hours = hours - 12;
    if (hours === 0) hours = 12;
    
    return `${hours}:${minutes} ${period}`;
  }
  
  return normalized;
}

/**
 * Normalize class name with "Studio " prefix
 */
function normalizeClassName(name: string): string {
  if (!name) return '';
  
  let normalized = name.trim();
  
  // Fix common OCR errors
  normalized = normalized.replace(/MATS7/gi, 'Mat 57');
  normalized = normalized.replace(/MAT\s*S7/gi, 'Mat 57');
  normalized = normalized.replace(/BARRES7/gi, 'Barre 57');
  normalized = normalized.replace(/BARRE\s*S7/gi, 'Barre 57');
  normalized = normalized.replace(/\bFT\b/gi, 'FIT');
  normalized = normalized.replace(/\bF\s*IT\b/gi, 'FIT');
  normalized = normalized.replace(/powerCycle/gi, 'PowerCycle');
  normalized = normalized.replace(/POWERCYCLE/gi, 'PowerCycle');
  
  // Normalize EXPRESS variations
  normalized = normalized.replace(/\bEXP\b/gi, 'Express');
  normalized = normalized.replace(/\bEXPR\b/gi, 'Express');
  normalized = normalized.replace(/\(EXPRESS\)/gi, 'Express');
  normalized = normalized.replace(/\(EXP\)/gi, 'Express');
  
  // Add "Studio " prefix if not present
  if (!normalized.toLowerCase().startsWith('studio ')) {
    normalized = 'Studio ' + normalized;
  }
  
  // Proper capitalization for common class names
  const classPatterns: [RegExp, string][] = [
    // Express classes first (more specific patterns)
    [/studio barre 57 express/gi, 'Studio Barre 57 Express'],
    [/studio mat 57 express/gi, 'Studio Mat 57 Express'],
    [/studio powercycle express/gi, 'Studio PowerCycle Express'],
    [/studio power cycle express/gi, 'Studio PowerCycle Express'],
    [/studio cardio barre express/gi, 'Studio Cardio Barre Express'],
    [/studio cardio b express/gi, 'Studio Cardio Barre Express'],
    [/studio back body blaze express/gi, 'Studio Back Body Blaze Express'],
    [/studio bbb express/gi, 'Studio Back Body Blaze Express'],
    [/studio fit express/gi, 'Studio FIT Express'],
    [/studio hiit express/gi, 'Studio HIIT Express'],
    // Regular classes
    [/studio barre 57/gi, 'Studio Barre 57'],
    [/studio mat 57/gi, 'Studio Mat 57'],
    [/studio fit/gi, 'Studio FIT'],
    [/studio hiit/gi, 'Studio HIIT'],
    [/studio powercycle/gi, 'Studio PowerCycle'],
    [/studio power cycle/gi, 'Studio PowerCycle'],
    [/studio cardio barre plus/gi, 'Studio Cardio Barre Plus'],
    [/studio cardio barre/gi, 'Studio Cardio Barre'],
    [/studio back body blaze/gi, 'Studio Back Body Blaze'],
    [/studio bbb/gi, 'Studio Back Body Blaze'],
    [/studio strength lab \(full body\)/gi, 'Studio Strength Lab (Full Body)'],
    [/studio strength lab \(push\)/gi, 'Studio Strength Lab (Push)'],
    [/studio strength lab \(pull\)/gi, 'Studio Strength Lab (Pull)'],
    [/studio strength \(full body\)/gi, 'Studio Strength Lab (Full Body)'],
    [/studio strength \(push\)/gi, 'Studio Strength Lab (Push)'],
    [/studio strength \(pull\)/gi, 'Studio Strength Lab (Pull)'],
    [/strength lab \(full body\)/gi, 'Studio Strength Lab (Full Body)'],
    [/strength lab \(push\)/gi, 'Studio Strength Lab (Push)'],
    [/strength lab \(pull\)/gi, 'Studio Strength Lab (Pull)'],
    [/strength \(full body\)/gi, 'Studio Strength Lab (Full Body)'],
    [/strength \(push\)/gi, 'Studio Strength Lab (Push)'],
    [/strength \(pull\)/gi, 'Studio Strength Lab (Pull)'],
    [/studio strength lab/gi, 'Studio Strength Lab'],
    [/studio recovery/gi, 'Studio Recovery'],
    [/studio foundations/gi, 'Studio Foundations'],
    [/studio sweat in 30/gi, 'Studio SWEAT In 30'],
    [/studio amped up!/gi, 'Studio Amped Up!'],
    [/studio amped up/gi, 'Studio Amped Up!'],
    [/studio trainer'?s choice/gi, "Studio Trainer's Choice"],
    [/studio pre\/post natal/gi, 'Studio Pre/Post Natal'],
    [/studio hosted class/gi, 'Studio Hosted Class'],
    [/studio tabata/gi, 'Studio TABATA'],
    [/studio icy isometric/gi, 'Studio ICY ISOMETRIC']
  ];
  
  for (const [pattern, replacement] of classPatterns) {
    if (pattern.test(normalized)) {
      normalized = replacement;
      break;
    }
  }
  
  return normalized;
}

/**
 * Normalize trainer name
 */
function normalizeTrainerName(name: string): string {
  if (!name) return '';
  
  let normalized = name.trim();
  
  // Map of first names to full names
  const trainerMappings: Record<string, string> = {
    'anisha': 'Anisha Shah',
    'atulan': 'Atulan Purohit',
    'janhavi': 'Janhavi Jain',
    'karanvir': 'Karanvir Bhatia',
    'karan': 'Karan Bhatia',
    'mrigakshi': 'Mrigakshi Jaiswal',
    'mrigakeni': 'Mrigakshi Jaiswal',
    'pranjali': 'Pranjali Jain',
    'pramal': 'Pranjali Jain',
    'reshma': 'Reshma Sharma',
    'richard': "Richard D'Costa",
    'rohan': 'Rohan Dahima',
    'upasna': 'Upasna Paranjpe',
    'saniya': 'Saniya Jaiswal',
    'vivaran': 'Vivaran Dhasmana',
    'nishanth': 'Nishanth Raj',
    'nishant': 'Nishanth Raj',
    'cauveri': 'Cauveri Vikrant',
    'kabir': 'Kabir Varma',
    'simonelle': 'Simonelle De Vitre',
    'simran': 'Simran Dutt',
    'anmol': 'Anmol Sharma',
    'bret': 'Bret Saldanha',
    'raunak': 'Raunak Khemuka',
    'kajol': 'Kajol Kanchan',
    'pushyank': 'Pushyank Nahar',
    'shruti': 'Shruti Kulkarni',
    'poojitha': 'Poojitha Bhaskar',
    'siddhartha': 'Siddhartha Kusuma',
    'chaitanya': 'Chaitanya Nahar',
    'veena': 'Veena Narasimhan',
    'sovena': 'Sovena Fernandes'
  };
  
  // Check if we have a mapping for this name (case-insensitive)
  const lowerName = normalized.toLowerCase();
  for (const [key, fullName] of Object.entries(trainerMappings)) {
    if (lowerName === key || lowerName.startsWith(key + ' ')) {
      return fullName;
    }
  }
  
  // If no mapping found, just return the capitalized version
  return normalized.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Normalize location name
 */
function normalizeLocation(location: string): string {
  if (!location) return 'Unknown';
  
  const lower = location.toLowerCase();
  
  if (lower.includes('kwality') || lower.includes('kemps')) {
    return 'Kwality House, Kemps Corner';
  }
  if (lower.includes('supreme') || lower.includes('bandra')) {
    return 'Supreme HQ, Bandra';
  }
  if (lower.includes('kenkere')) {
    return 'Kenkere House';
  }
  
  return location;
}

/**
 * Main function: Extract schedule from PDF using Gemini Vision
 */
export async function extractScheduleWithGemini(
  file: File,
  location: string,
  onProgress?: (progress: number, message: string) => void
): Promise<{
  success: boolean;
  data: PdfClassData[];
  rawText: string;
  error?: string;
}> {
  const normalizedLocation = normalizeLocation(location);
  const allClasses: PdfClassData[] = [];
  const seenKeys = new Set<string>();
  let fullRawText = '';
  
  try {
    // Get number of pages
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    
    console.log(`Processing ${numPages} PDF pages with Gemini Vision...`);
    onProgress?.(0, `Starting analysis of ${numPages} page(s)...`);
    
    // Process each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      onProgress?.(
        Math.round((pageNum - 1) / numPages * 100),
        `Analyzing page ${pageNum} of ${numPages} with AI...`
      );
      
      try {
        console.log(`Converting page ${pageNum} to image...`);
        const imageBase64 = await pdfPageToImage(file, pageNum, 2.5);
        
        console.log(`Sending page ${pageNum} to Gemini Vision...`);
        const result = await extractScheduleWithGeminiVision(imageBase64, normalizedLocation, pageNum);
        
        if (result.success && result.classes.length > 0) {
          fullRawText += result.rawText + '\n\n';
          
          // Add classes with deduplication
          for (const cls of result.classes) {
            const uniqueKey = (cls.day + cls.time + cls.className + cls.trainer + normalizedLocation)
              .toLowerCase()
              .replace(/\s+/g, '');
            
            if (!seenKeys.has(uniqueKey)) {
              seenKeys.add(uniqueKey);
              allClasses.push({
                day: cls.day,
                time: cls.time,
                className: cls.className,
                trainer: cls.trainer,
                location: normalizedLocation,
                theme: cls.theme,
                uniqueKey
              });
            }
          }
          
          console.log(`Page ${pageNum}: Added ${result.classes.length} classes (total: ${allClasses.length})`);
        } else {
          console.warn(`Page ${pageNum}: No classes extracted`);
          if (result.error) {
            console.error(`Page ${pageNum} error:`, result.error);
          }
        }
        
      } catch (pageError) {
        console.error(`Error processing page ${pageNum}:`, pageError);
      }
      
      // Small delay to avoid rate limiting
      if (pageNum < numPages) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    onProgress?.(100, `Completed! Found ${allClasses.length} classes.`);
    
    // Sort by day and time
    const dayOrder: Record<string, number> = {
      'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
      'Friday': 5, 'Saturday': 6, 'Sunday': 7
    };
    
    allClasses.sort((a, b) => {
      const dayDiff = (dayOrder[a.day] || 8) - (dayOrder[b.day] || 8);
      if (dayDiff !== 0) return dayDiff;
      
      // Parse times for comparison
      const parseTime = (t: string) => {
        const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return 0;
        let hours = parseInt(match[1]);
        const mins = parseInt(match[2]);
        const isPM = match[3].toUpperCase() === 'PM';
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        return hours * 60 + mins;
      };
      
      return parseTime(a.time) - parseTime(b.time);
    });
    
    console.log(`Gemini Vision extraction complete: ${allClasses.length} total classes`);
    
    return {
      success: allClasses.length > 0,
      data: allClasses,
      rawText: fullRawText
    };
    
  } catch (error) {
    console.error('Gemini Vision extraction failed:', error);
    return {
      success: false,
      data: [],
      rawText: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Alternative: Use Gemini to process raw OCR text for better understanding
 */
export async function enhanceOCRWithGemini(
  rawOCRText: string,
  location: string
): Promise<{
  success: boolean;
  data: PdfClassData[];
  error?: string;
}> {
  // Check if API key is available
  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is not set for OCR enhancement!');
    return { success: false, data: [], error: 'Gemini API key not configured' };
  }
  
  const normalizedLocation = normalizeLocation(location);
  
  const prompt = `You are an expert at parsing fitness class schedule data. 

Here is raw OCR text from a fitness studio schedule:

"""
${rawOCRText}
"""

Parse this text and extract ALL class entries. The schedule is organized by days of the week.

IMPORTANT:
1. Extract EVERY class entry, even if the OCR text is messy
2. Each entry has: Day, Time, Class Name, Trainer Name
3. Fix obvious OCR errors:
   - "MATS7" or "MAT S7" = "Mat 57"
   - "BARRES7" = "Barre 57"
   - "FT" or "F IT" = "FIT"
   - "powerCycle" = "PowerCycle"
   - "730AM" = "7:30 AM"
4. Days are: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
5. Common class types: Barre 57, Mat 57, PowerCycle, FIT, HIIT, Strength Lab, Cardio Barre, Back Body Blaze, Recovery, Foundations, SWEAT In 30, Amped Up!
6. Add "Studio " prefix to class names

Return ONLY a JSON array like this:
[
  {"day": "Monday", "time": "7:30 AM", "className": "Studio Barre 57", "trainer": "Anisha Shah", "theme": null},
  {"day": "Tuesday", "time": "5:00 PM", "className": "Studio FIT", "trainer": "Richard D'Costa", "theme": null}
]

Extract ALL classes. Be thorough.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_VISION_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) {
      return { success: false, data: [], error: 'No response from Gemini' };
    }

    // Parse the JSON
    let parsedClasses;
    try {
      let jsonStr = textContent.trim();
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
      parsedClasses = JSON.parse(jsonStr.trim());
    } catch (e) {
      return { success: false, data: [], error: 'Failed to parse Gemini response' };
    }

    const classes: PdfClassData[] = [];
    const seenKeys = new Set<string>();

    for (const cls of parsedClasses) {
      if (!cls.day || !cls.time || !cls.className || !cls.trainer) continue;
      
      const uniqueKey = (cls.day + cls.time + cls.className + cls.trainer + normalizedLocation)
        .toLowerCase()
        .replace(/\s+/g, '');
      
      if (!seenKeys.has(uniqueKey)) {
        seenKeys.add(uniqueKey);
        classes.push({
          day: cls.day,
          time: normalizeTimeFormat(cls.time),
          className: normalizeClassName(cls.className),
          trainer: normalizeTrainerName(cls.trainer),
          location: normalizedLocation,
          theme: cls.theme || undefined,
          uniqueKey
        });
      }
    }

    return { success: classes.length > 0, data: classes };

  } catch (error) {
    console.error('Gemini text enhancement failed:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
