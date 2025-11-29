
import { PdfClassData } from '@/types/schedule';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_VISION_MODEL = 'gemini-2.0-flash';

export function getTrainerImageUrl(name: string): string {
  if (!name) return 'https://placehold.co/28x28?text=NA&bg=cccccc&fg=555555';
  
  // Get initials from name
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  // Generate a consistent color based on name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = `hsl(${hash % 360}, 60%, 70%)`;
  
  // Encode color for URL
  const bg = encodeURIComponent(color);
  const fg = '333333';
  
  return `https://placehold.co/28x28/${bg}/${fg}?text=${initials}`;
}

/**
 * Convert an image file to base64
 */
export async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Get MIME type for image file
 */
function getImageMimeType(file: File): string {
  const type = file.type.toLowerCase();
  if (type.includes('png')) return 'image/png';
  if (type.includes('gif')) return 'image/gif';
  if (type.includes('webp')) return 'image/webp';
  return 'image/jpeg';
}

/**
 * Normalize time format
 */
function normalizeTimeFormat(time: string): string {
  if (!time) return '';
  
  let normalized = time.trim().toUpperCase();
  normalized = normalized.replace(/^(\d{1,2})(\d{2})(AM|PM)$/i, '$1:$2 $3');
  normalized = normalized.replace(/(\d)(AM|PM)$/i, '$1 $2');
  normalized = normalized.replace(/(\d)\.(\d)/g, '$1:$2');
  normalized = normalized.replace(/\s+/g, ' ');
  
  const match = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const period = match[3].toUpperCase();
    
    if (hours > 12) hours = hours - 12;
    if (hours === 0) hours = 12;
    
    return `${hours}:${minutes} ${period}`;
  }
  
  return normalized;
}

/**
 * Normalize class name
 */
function normalizeClassName(name: string): string {
  if (!name) return '';
  
  let normalized = name.trim();
  
  normalized = normalized.replace(/MATS7/gi, 'Mat 57');
  normalized = normalized.replace(/MAT\s*S7/gi, 'Mat 57');
  normalized = normalized.replace(/BARRES7/gi, 'Barre 57');
  normalized = normalized.replace(/BARRE\s*S7/gi, 'Barre 57');
  normalized = normalized.replace(/\bFT\b/gi, 'FIT');
  normalized = normalized.replace(/\bF\s*IT\b/gi, 'FIT');
  normalized = normalized.replace(/powerCycle/gi, 'PowerCycle');
  
  if (!normalized.toLowerCase().startsWith('studio ')) {
    normalized = 'Studio ' + normalized;
  }
  
  return normalized;
}

/**
 * Normalize trainer name
 */
function normalizeTrainerName(name: string): string {
  if (!name) return '';
  
  const trainerMappings: Record<string, string> = {
    'anisha': 'Anisha Shah',
    'atulan': 'Atulan Purohit',
    'janhavi': 'Janhavi Jain',
    'karanvir': 'Karanvir Bhatia',
    'karan': 'Karan Bhatia',
    'mrigakshi': 'Mrigakshi Jaiswal',
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
  
  const lowerName = name.trim().toLowerCase();
  for (const [key, fullName] of Object.entries(trainerMappings)) {
    if (lowerName === key || lowerName.startsWith(key + ' ')) {
      return fullName;
    }
  }
  
  return name.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Normalize location
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
 * Extract schedule from an image file using Gemini Vision
 */
export async function extractScheduleFromImage(
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
  
  try {
    onProgress?.(10, 'Converting image...');
    const imageBase64 = await imageToBase64(file);
    const mimeType = getImageMimeType(file);
    
    onProgress?.(30, 'Sending to Gemini Vision AI...');
    
    const prompt = `You are an expert at extracting class schedule data from fitness studio schedule images.

Analyze this image of a fitness class schedule and extract ALL class entries.

IMPORTANT EXTRACTION RULES:
1. Extract EVERY class entry you can find, even if partially visible
2. The schedule is organized by days of the week (Monday through Sunday)
3. Each class entry typically has: Time, Class Name, and Trainer Name
4. Class names may include: Barre 57, Mat 57, PowerCycle, FIT, HIIT, Strength Lab, Cardio Barre, Back Body Blaze, Recovery, Foundations, SWEAT In 30, Amped Up!, etc.
5. Times are in 12-hour format (e.g., 7:30 AM, 5:00 PM)
6. Trainer names are usually first names or full names
7. Some classes may have themes like "SLAY SUNDAY", "GLUTES GALORE", "BATTLE OF THE BANDS", etc.
8. The schedule may have columns for different days side by side
9. OCR might have errors - use context to fix obvious mistakes

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

Extract ALL classes visible in the image. Be thorough.`;

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
                  mimeType: mimeType,
                  data: imageBase64
                }
              }
            ]
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

    onProgress?.(70, 'Processing AI response...');

    const result = await response.json();
    const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) {
      return {
        success: false,
        data: [],
        rawText: '',
        error: 'No response from Gemini Vision'
      };
    }

    let parsedData;
    try {
      let jsonStr = textContent.trim();
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
      parsedData = JSON.parse(jsonStr.trim());
    } catch (e) {
      console.error('Failed to parse Gemini response:', textContent);
      return {
        success: false,
        data: [],
        rawText: textContent,
        error: 'Failed to parse JSON response'
      };
    }

    onProgress?.(90, 'Normalizing data...');

    const classes: PdfClassData[] = [];
    const seenKeys = new Set<string>();

    for (const cls of (parsedData.classes || [])) {
      if (!cls.day || !cls.time || !cls.className || !cls.trainer) continue;
      
      const day = cls.day;
      const time = normalizeTimeFormat(cls.time);
      const className = normalizeClassName(cls.className);
      const trainer = normalizeTrainerName(cls.trainer);
      
      const uniqueKey = (day + time + className + trainer + normalizedLocation)
        .toLowerCase()
        .replace(/\s+/g, '');
      
      if (!seenKeys.has(uniqueKey)) {
        seenKeys.add(uniqueKey);
        classes.push({
          day,
          time,
          className,
          trainer,
          location: normalizedLocation,
          theme: cls.theme || undefined,
          uniqueKey
        });
      }
    }

    // Sort by day and time
    const dayOrder: Record<string, number> = {
      'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
      'Friday': 5, 'Saturday': 6, 'Sunday': 7
    };
    
    classes.sort((a, b) => {
      const dayDiff = (dayOrder[a.day] || 8) - (dayOrder[b.day] || 8);
      if (dayDiff !== 0) return dayDiff;
      
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

    onProgress?.(100, `Found ${classes.length} classes!`);

    return {
      success: classes.length > 0,
      data: classes,
      rawText: parsedData.rawText || textContent
    };

  } catch (error) {
    console.error('Image extraction failed:', error);
    return {
      success: false,
      data: [],
      rawText: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
