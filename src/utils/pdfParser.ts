import { PdfClassData } from '@/types/schedule';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import Fuse from 'fuse.js';

// Set up PDF.js worker - use local worker file for reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Normalized class names
const knownClassesList = [
  "Studio Hosted Class", "Studio FIT", "Studio Back Body Blaze", "Studio Barre 57", 
  "Studio Mat 57", "Studio Trainer's Choice", "Studio Cardio Barre Express", 
  "Studio Amped Up!", "Studio HIIT", "Studio Foundations", "Studio SWEAT In 30", 
  "Studio Cardio Barre Plus", "Studio Barre 57 Express", "Studio Cardio Barre", 
  "Studio Back Body Blaze Express", "Studio Recovery", "Studio Pre/Post Natal", 
  "Studio Mat 57 Express", "Studio PowerCycle", "Studio PowerCycle Express", 
  "Studio Strength Lab", "Studio Strength Lab (Full Body)", "Studio Strength Lab (Push)",
  "Studio Strength Lab (Pull)", "Studio TABATA", "Studio ICY ISOMETRIC"
];

// Class name mappings for normalization
const classNameMappings: {[key: string]: string} = {
  // Strength Lab variations
  'STRENGTH LAB (FULL BODY)': 'Studio Strength Lab (Full Body)',
  'STRENGTH LAB (PULL)': 'Studio Strength Lab (Pull)',
  'STRENGTH LAB (PUSH)': 'Studio Strength Lab (Push)',
  'STRENGTH (PULL)': 'Studio Strength Lab (Pull)',
  'STRENGTH (PUSH)': 'Studio Strength Lab (Push)',
  'STRENGTH (PULL': 'Studio Strength Lab (Pull)',
  'STRENGTH (PUSH': 'Studio Strength Lab (Push)',
  'STRENGTH (FULL BODY': 'Studio Strength Lab (Full Body)',
  'Strength Lab (Full body)': 'Studio Strength Lab (Full Body)',
  'STRENGTH LAB': 'Studio Strength Lab',
  
  // PowerCycle variations (note lowercase 'p' in some cases)
  'powerCycle': 'Studio PowerCycle',
  'POWERCYCLE': 'Studio PowerCycle',
  'Powercycle': 'Studio PowerCycle',
  'PowerCycle': 'Studio PowerCycle',
  'powerCycle (EXPRESS)': 'Studio PowerCycle Express',
  'POWERCYCLE (EXPRESS)': 'Studio PowerCycle Express',
  
  // Other class name variations
  'Barre 57': 'Studio Barre 57',
  'BARRE 57': 'Studio Barre 57',
  'Barre57': 'Studio Barre 57',
  'BARRE57': 'Studio Barre 57',
  'BARRES7': 'Studio Barre 57',
  'BARRE S7': 'Studio Barre 57',
  'Cardio Barre': 'Studio Cardio Barre',
  'CARDIO BARRE': 'Studio Cardio Barre',
  'Cardio Barre Plus': 'Studio Cardio Barre Plus',
  'CARDIO BARRE PLUS': 'Studio Cardio Barre Plus',
  'Cardio Barre Express': 'Studio Cardio Barre Express',
  'CARDIO BARRE EXPRESS': 'Studio Cardio Barre Express',
  'Cardio Barre (Express)': 'Studio Cardio Barre Express',
  'Foundations': 'Studio Foundations',
  'FOUNDATIONS': 'Studio Foundations',
  'Mat 57': 'Studio Mat 57',
  'MAT 57': 'Studio Mat 57',
  'Mat57': 'Studio Mat 57',
  'MAT57': 'Studio Mat 57',
  'MATS7': 'Studio Mat 57',
  'MAT S7': 'Studio Mat 57',
  'Mat 57 (Express)': 'Studio Mat 57 Express',
  'MAT 57 (EXPRESS)': 'Studio Mat 57 Express',
  'MAT57 (EXPRESS)': 'Studio Mat 57 Express',
  'MAT57 ( EXPRESS)': 'Studio Mat 57 Express',
  'MATS57 (EXPRESS)': 'Studio Mat 57 Express',
  'Fit': 'Studio FIT',
  'FIT': 'Studio FIT',
  'FT': 'Studio FIT',
  'F IT': 'Studio FIT',
  'Back Body Blaze': 'Studio Back Body Blaze',
  'BACK BODY BLAZE': 'Studio Back Body Blaze',
  'Back Body Blaze (Express)': 'Studio Back Body Blaze Express',
  'BACK BODY BLAZE (EXPRESS)': 'Studio Back Body Blaze Express',
  'BACK BODY BLAZE EXPRESS': 'Studio Back Body Blaze Express',
  'BACK BODY BLAZE EXPRES S': 'Studio Back Body Blaze Express',
  'Sweat in 30': 'Studio SWEAT In 30',
  'SWEAT IN 30': 'Studio SWEAT In 30',
  'Recovery': 'Studio Recovery',
  'RECOVERY': 'Studio Recovery',
  'Pre/Post Natal': 'Studio Pre/Post Natal',
  'HIIT': 'Studio HIIT',
  'Amped Up!': 'Studio Amped Up!',
  'AMPED UP': 'Studio Amped Up!',
  'AMPED UP!': 'Studio Amped Up!',
  "Trainer's Choice": 'Studio Trainer\'s Choice',
  'PowerCycle': 'Studio PowerCycle',
  'PowerCycle (Express)': 'Studio PowerCycle Express',
  'Hosted Class': 'Studio Hosted Class',
  
  // Additional classes from the schedule
  'TABATA': 'Studio TABATA',
  'ICY ISOMETRIC': 'Studio ICY ISOMETRIC',
  
  // Special theme classes
  'SLAY GLUTES GALORE': 'Studio Barre 57',
  'BATTLE OF THE BANDS': 'Studio Barre 57',
  'BATTLE OF THE BANDS BARRE 57': 'Studio Barre 57',
  'SLAY GLUTES GALORE BARRE 57': 'Studio Barre 57',
  'SLAY GLUTES': 'Studio Barre 57',
  'GLUTES GALORE': 'Studio Barre 57'
};

// Normalized teacher names (deduplicated)
const normalizedTeacherNames = [
  "Anisha Shah", "Atulan Purohit", "Janhavi Jain", "Karanvir Bhatia", "Karan Bhatia",
  "Mrigakshi Jaiswal", "Pranjali Jain", "Reshma Sharma", "Richard D'Costa",
  "Rohan Dahima", "Upasna Paranjpe", "Saniya Jaiswal",
  "Vivaran Dhasmana", "Nishanth Raj", "Cauveri Vikrant", "Kabir Varma",
  "Simonelle De Vitre", "Simran Dutt", "Anmol Sharma", "Bret Saldanha",
  "Raunak Khemuka", "Kajol Kanchan", "Pushyank Nahar", "Shruti Kulkarni",
  "Shruti Suresh", "Poojitha Bhaskar", "Siddhartha Kusuma",
  "Chaitanya Nahar", "Veena Narasimhan", "Sovena Fernandes"
];

// Teacher name mappings for normalization
const teacherNameMappings: {[key: string]: string} = {
  "Nishant": "Nishanth Raj",
  "Karanvir": "Karanvir Bhatia",
  "Karan": "Karan Bhatia",
  "Vivaran": "Vivaran Dhasmana",
  "Kajol": "Kajol Kanchan",
  "Shruti": "Shruti Kulkarni",
  "Richard": "Richard D'Costa",
  "Reshma": "Reshma Sharma",
  "Pranjali": "Pranjali Jain",
  "Pramal": "Pranjali Jain",
  "Mrigakshi": "Mrigakshi Jaiswal",
  "Mrigakeni": "Mrigakshi Jaiswal",
  "Janhavi": "Janhavi Jain",
  "Atulan": "Atulan Purohit",
  "Awlan": "Atulan Purohit",
  "Anisha": "Anisha Shah",
  "Upasna": "Upasna Paranjpe",
  "Rohan": "Rohan Dahima",
  "Saniya": "Saniya Jaiswal",
  "Cauveri": "Cauveri Vikrant",
  "Kabir": "Kabir Varma",
  "Simonelle": "Simonelle De Vitre",
  "Simran": "Simran Dutt",
  "Anmol": "Anmol Sharma",
  "Bret": "Bret Saldanha",
  "Raunak": "Raunak Khemuka",
  "Pushyank": "Pushyank Nahar",
  "Poojitha": "Poojitha Bhaskar",
  "Siddhartha": "Siddhartha Kusuma",
  "Sovena": "Sovena Fernandes",
  "Chaitanya": "Chaitanya Nahar",
  "Veena": "Veena Narasimhan"
};

// Normalized locations
const normalizedLocations = [
  "Kwality House, Kemps Corner",
  "Supreme HQ, Bandra",
  "Kenkere House",
  "South United Football Club",
  "The Studio by Copper + Cloves",
  "WeWork Galaxy",
  "WeWork Prestige Central",
  "Physique Outdoor Pop-up"
];

// Location mappings for normalization
const locationMappings: {[key: string]: string} = {
  "Kwality House": "Kwality House, Kemps Corner",
  "Kemps Corner": "Kwality House, Kemps Corner",
  "Supreme HQ": "Supreme HQ, Bandra",
  "Bandra": "Supreme HQ, Bandra",
  "Kenkere": "Kenkere House",
  "South United": "South United Football Club",
  "Football Club": "South United Football Club",
  "Copper + Cloves": "The Studio by Copper + Cloves",
  "WeWork Galaxy": "WeWork Galaxy",
  "WeWork Prestige": "WeWork Prestige Central",
  "Outdoor Pop-up": "Physique Outdoor Pop-up"
};

// Helper function to normalize time string
function normalizeTime(rawTime: string): string {
  if (!rawTime) return '';
  
  let time = rawTime.trim();
  
  // Remove any extra spaces
  time = time.replace(/\s+/g, ' ');
  
  // Handle OCR errors: S00AM -> 9:00 AM (S looks like 9), 10:5AM -> 10:05 AM
  time = time.replace(/^S(\d{2})\s*(AM|PM)/i, '9:$1 $2');
  time = time.replace(/^(\d{1,2}):(\d{1})\s*(AM|PM)/i, (match, h, m, p) => `${h}:${m}0 ${p}`);
  
  // Handle times without spaces before AM/PM (e.g., "5:00PM" -> "5:00 PM")
  time = time.replace(/(\d)(AM|PM)/gi, '$1 $2');
  
  // Fix OCR errors like "730AM" -> "7:30 AM" or "1030AM" -> "10:30 AM" or "1130AM" -> "11:30 AM"
  time = time.replace(/^(\d{1,2})(\d{2})\s*(AM|PM)/i, '$1:$2 $3');
  
  // Replace periods and commas with colons
  time = time.replace(/(\d)[.,](\d)/g, '$1:$2');
  
  // Handle times with missing minutes (e.g., "5 PM" -> "5:00 PM")
  time = time.replace(/^(\d{1,2})\s+(AM|PM)$/gi, '$1:00 $2');
  
  // Handle times with extra spaces around colon
  time = time.replace(/\s*:\s*/g, ':');
  
  // Ensure proper format
  const match = time.match(/(\d{1,2}):?(\d{0,2})\s*(AM|PM)/i);
  if (match) {
    let hours = parseInt(match[1]);
    let minutes = match[2] || '00';
    let period = match[3].toUpperCase();
    
    // Validate hours
    if (hours > 12) {
      if (hours >= 13 && hours <= 23) {
        hours = hours - 12;
        period = 'PM';
      } else if (hours > 23 && hours < 100) {
        return '';
      } else if (hours >= 100) {
        return '';
      }
    }
    
    if (hours < 1 || hours === 0) {
      return '';
    }
    
    // Optional heuristic: remap unlikely 1:XX AM to 11:XX AM.
    // Disabled by default to avoid silent misclassification. Enable by setting global flag.
    if (typeof (globalThis as any).ENABLE_1AM_TO_11AM_HEURISTIC !== 'undefined') {
      const enableHeuristic = !!(globalThis as any).ENABLE_1AM_TO_11AM_HEURISTIC;
      if (enableHeuristic && hours === 1 && period === 'AM' && minutes !== '00') {
        hours = 11;
      }
    }
    
    // Pad minutes
    if (minutes.length === 0) {
      minutes = '00';
    } else if (minutes.length === 1) {
      minutes = minutes + '0';
    }
    
    // Validate minutes
    const minutesInt = parseInt(minutes);
    if (minutesInt > 59) {
      console.log(`Rejecting invalid minutes: ${rawTime}`);
      return '';
    }
    
    return `${hours}:${minutes} ${period}`;
  }
  
  return '';  // Return empty instead of garbage
}

// Cached Fuse instances for performance (avoid re-instantiation per match)
const classFuse = new Fuse(knownClassesList, {
  includeScore: true,
  threshold: 0.4,
  ignoreLocation: true,
  distance: 100
});
const teacherFuse = new Fuse(normalizedTeacherNames, {
  includeScore: true,
  threshold: 0.4,
  ignoreLocation: true,
  distance: 100
});
const locationFuse = new Fuse(normalizedLocations, {
  includeScore: true,
  threshold: 0.4,
  ignoreLocation: true,
  distance: 100
});

// Helper function to normalize class name
function matchClassName(text: string): string {
  if (!text) return '';
  
  // Strip any leading time patterns (e.g., "7:30 AM BARRE 57" -> "BARRE 57")
  let trimmed = text.trim();
  trimmed = trimmed.replace(/^\d{1,2}[:.]\d{2}\s*(?:AM|PM)?\s*/i, '');
  // Also strip any leading garbage (1-3 random letters before actual content)
  trimmed = trimmed.replace(/^[a-z]{1,3}\s+(?=\d|[A-Z])/i, '');
  // Strip OCR garbage like "750 AU 57 Exr e ees M" at the end
  trimmed = trimmed.replace(/\s+\d{3,}\s+[A-Z]{2,}\s+\d+.*$/i, '');
  // Strip patterns like "AU 57 Exr" or similar OCR noise
  trimmed = trimmed.replace(/\s+[A-Z]{2,}\s+\d+\s+[A-Za-z]{2,}.*$/i, '');
  // Strip trailing garbage patterns
  trimmed = trimmed.replace(/\s+[A-Za-z]\s+[a-z]+\s*$/i, '');
  // Remove patterns like "S7" followed by garbage
  trimmed = trimmed.replace(/S7\s+[A-Za-z]+.*$/i, 'S7');
  // Clean up spaces
  trimmed = trimmed.replace(/\s+/g, ' ').trim();
  
  if (!trimmed) return '';
  
  // Fix common OCR errors before matching
  // MATS7 -> MAT 57, BARRES7 -> BARRE 57, etc.
  trimmed = trimmed.replace(/MATS7/gi, 'MAT 57');
  trimmed = trimmed.replace(/BARRES7/gi, 'BARRE 57');
  trimmed = trimmed.replace(/MAT\s*S7/gi, 'MAT 57');
  trimmed = trimmed.replace(/BARRE\s*S7/gi, 'BARRE 57');
  trimmed = trimmed.replace(/\bFT\b/gi, 'FIT');
  trimmed = trimmed.replace(/\bF IT\b/gi, 'FIT');
  
  // First check for exact mappings
  for (const [key, value] of Object.entries(classNameMappings)) {
    if (trimmed.toUpperCase() === key.toUpperCase()) {
      return value;
    }
  }
  
  // Then use fuzzy matching for other classes (cached Fuse)
  const cleaned = trimmed.replace(/[\s\-_.]+/g, " ").trim();
  const result = classFuse.search(cleaned);
  
  if (result.length > 0 && result[0].score && result[0].score < 0.5) {
    return result[0].item;
  }
  
  return trimmed;
}

// Helper function to normalize teacher name
function normalizeTeacherName(name: string): string {
  if (!name) return '';
  
  const trimmed = name.trim();
  
  // First check for exact mappings
  for (const [key, value] of Object.entries(teacherNameMappings)) {
    if (trimmed.toUpperCase() === key.toUpperCase()) {
      return value;
    }
  }
  
  // Then use fuzzy matching for other names (cached Fuse)
  const result = teacherFuse.search(trimmed);
  
  if (result.length > 0) {
    return result[0].item;
  }
  
  return trimmed;
}

// Helper function to normalize location
function normalizeLocation(location: string): string {
  if (!location) return '';
  
  const trimmed = location.trim();
  
  // First check for exact mappings
  for (const [key, value] of Object.entries(locationMappings)) {
    if (trimmed.toUpperCase() === key.toUpperCase()) {
      return value;
    }
  }
  
  // Then use fuzzy matching for other locations (cached Fuse)
  const result = locationFuse.search(trimmed);
  
  if (result.length > 0) {
    return result[0].item;
  }
  
  return trimmed;
}

// Helper function to check if a class name is valid (not a trainer name or invalid entry)
function isValidClassName(className: string): boolean {
  if (!className || className.trim() === '') return false;
  
  const trimmed = className.trim().toLowerCase();
  
  // List of invalid class names that should be excluded
  const invalidNames = [
    'smita parekh', 'anandita', '2', 'hosted', '1', 'taarika', 'sakshi',
    'smita', 'parekh', 'anand', 'anandi', 'host', 'cover', 'replacement'
  ];
  
  // Check if the class name matches any invalid names
  for (const invalid of invalidNames) {
    if (trimmed === invalid || trimmed.includes(invalid)) {
      return false;
    }
  }
  
  // Check if it's just a number
  if (/^\d+$/.test(trimmed)) {
    return false;
  }
  
  // Check if it's a single word that might be a trainer name
  if (trimmed.split(' ').length === 1 && trimmed.length < 4) {
    return false;
  }
  
  return true;
}

// Helper function to normalize day name
function normalizeDay(dayRaw: string): string {
  if (!dayRaw) return '';
  
  const lower = dayRaw.toLowerCase();
  const capitalized = lower.charAt(0).toUpperCase() + lower.slice(1);
  
  if (daysOrder.includes(capitalized)) return capitalized;
  
  return dayRaw;
}

// Extract text from PDF using PDF.js
// Interface for positioned text items
interface PositionedTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Interface for column-grouped data
interface ColumnData {
  dayHeader: string;
  xMin: number;
  xMax: number;
  items: PositionedTextItem[];
}

// Extract text with position information from PDF
export async function extractTextWithPositions(file: File): Promise<{ 
  fullText: string; 
  columns: Map<string, { classes: string[]; times: string[] }>;
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const allItems: PositionedTextItem[] = [];
    const maxPages = Math.min(pdf.numPages, 10);
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });
        
        textContent.items.forEach((item: any) => {
          if (item.str && item.str.trim()) {
            // Transform coordinates to page coordinates
            const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
            allItems.push({
              text: item.str.trim(),
              x: tx[4], // x position
              y: viewport.height - tx[5], // y position (invert for top-to-bottom)
              width: item.width || 0,
              height: item.height || 0
            });
          }
        });
      } catch (pageError) {
        console.error(`Error processing page ${pageNum}:`, pageError);
      }
    }
    
    console.log(`Extracted ${allItems.length} positioned text items`);
    console.log('Sample items:', allItems.slice(0, 20).map(i => `"${i.text}" at (${i.x.toFixed(0)}, ${i.y.toFixed(0)})`).join(', '));
    
    // Find day headers and their X positions
    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    
    // Collect ALL day header occurrences first
    const dayOccurrences: { day: string; x: number; y: number }[] = [];
    
    allItems.forEach(item => {
      const dayMatch = daysOfWeek.find(day => 
        new RegExp(`^${day}$`, 'i').test(item.text) || 
        new RegExp(`^${day}\\b`, 'i').test(item.text)
      );
      if (dayMatch) {
        dayOccurrences.push({ day: dayMatch, x: item.x, y: item.y });
        console.log(`Found day: ${dayMatch} at x=${item.x.toFixed(0)}, y=${item.y.toFixed(0)}`);
      }
    });
    
    console.log(`Total day occurrences: ${dayOccurrences.length}`);
    
    // Group by unique X positions (within tolerance) to find column positions
    const xTolerance = 30;
    const uniqueXPositions: { x: number; days: string[] }[] = [];
    
    dayOccurrences.forEach(occ => {
      const existing = uniqueXPositions.find(p => Math.abs(p.x - occ.x) < xTolerance);
      if (existing) {
        if (!existing.days.includes(occ.day)) {
          existing.days.push(occ.day);
        }
      } else {
        uniqueXPositions.push({ x: occ.x, days: [occ.day] });
      }
    });
    
    // Sort by X position
    uniqueXPositions.sort((a, b) => a.x - b.x);
    console.log('Unique X positions:', uniqueXPositions.map(p => `x=${p.x.toFixed(0)} (${p.days.join(', ')})`).join(' | '));
    
    // Create column data for each unique day
    const dayColumns: ColumnData[] = [];
    const seenDays = new Set<string>();
    
    // First, try to create columns from the first occurrence of each day
    dayOccurrences
      .sort((a, b) => a.x - b.x) // Sort by X position
      .forEach(occ => {
        if (!seenDays.has(occ.day)) {
          seenDays.add(occ.day);
          dayColumns.push({
            dayHeader: occ.day,
            xMin: occ.x - 20,
            xMax: occ.x + 200,
            items: []
          });
        }
      });
    
    // Sort columns by X position
    dayColumns.sort((a, b) => a.xMin - b.xMin);
    
    // Adjust column boundaries based on next column
    for (let i = 0; i < dayColumns.length - 1; i++) {
      dayColumns[i].xMax = dayColumns[i + 1].xMin - 1;
    }
    if (dayColumns.length > 0) {
      dayColumns[dayColumns.length - 1].xMax = 9999;
    }
    
    console.log('Final columns:', dayColumns.map(c => `${c.dayHeader}: ${c.xMin.toFixed(0)}-${c.xMax.toFixed(0)}`).join(', '));
    
    // Assign items to columns based on X position
    allItems.forEach(item => {
      for (const column of dayColumns) {
        if (item.x >= column.xMin && item.x < column.xMax) {
          column.items.push(item);
          break;
        }
      }
    });
    
    // Process each column to extract classes and times
    const columns = new Map<string, { classes: string[]; times: string[] }>();
    
    dayColumns.forEach(column => {
      // Sort items by Y position (top to bottom)
      column.items.sort((a, b) => a.y - b.y);
      
      const classes: string[] = [];
      const times: string[] = [];
      
      // Group items by Y position (items on same line)
      const lineGroups: PositionedTextItem[][] = [];
      let currentLine: PositionedTextItem[] = [];
      let lastY = -1;
      
      column.items.forEach(item => {
        if (lastY === -1 || Math.abs(item.y - lastY) < 10) {
          currentLine.push(item);
        } else {
          if (currentLine.length > 0) {
            lineGroups.push(currentLine);
          }
          currentLine = [item];
        }
        lastY = item.y;
      });
      if (currentLine.length > 0) {
        lineGroups.push(currentLine);
      }
      
      // Process each line
      lineGroups.forEach(lineItems => {
        // Sort items on the line by X position (left to right)
        lineItems.sort((a, b) => a.x - b.x);
        const lineText = lineItems.map(i => i.text).join(' ').trim();
        
        // Skip day headers
        if (daysOfWeek.some(d => new RegExp(`^${d}$`, 'i').test(lineText))) {
          return;
        }
        
        // Check if entire line is a time
        const timeMatch = lineText.match(/^(\d{1,2}[:.]\d{2}\s*(?:AM|PM)|\d{1,2}\s*(?:AM|PM))$/i);
        if (timeMatch) {
          const normalized = normalizeTime(timeMatch[1]);
          if (normalized) times.push(normalized);
          return;
        }
        
        // Check if line contains multiple times
        const multiTimeMatch = lineText.match(/(\d{1,2}[:.]\d{2}\s*(?:AM|PM))/gi);
        if (multiTimeMatch && multiTimeMatch.length > 0 && !lineText.includes('-')) {
          multiTimeMatch.forEach(t => {
            const normalized = normalizeTime(t);
            if (normalized) times.push(normalized);
          });
          return;
        }
        
        // Check if it's a class-trainer pair
        const classTrainerMatch = lineText.match(/^(.+?)\s*[-–—]\s*([A-Za-z]+)$/);
        if (classTrainerMatch) {
          const rawClass = classTrainerMatch[1].trim();
          const trainer = classTrainerMatch[2].trim();
          if (trainer.length >= 3 && !/^(AM|PM|EXPRESS|FULL|BODY|PUSH|PULL|LAB)$/i.test(trainer)) {
            classes.push(`${rawClass} - ${trainer}`);
            console.log(`  Column ${column.dayHeader}: Found class "${rawClass}" with trainer "${trainer}"`);
          }
        }
      });
      
      columns.set(column.dayHeader, { classes, times });
      console.log(`${column.dayHeader}: ${classes.length} classes, ${times.length} times`);
    });
    
    // If we found too few days, try a different approach - look at the raw text
    if (dayColumns.length <= 2) {
      console.log('Few days found via positions, trying text-based approach...');
      
      // Build full text and try to split by days
      const sortedItems = [...allItems].sort((a, b) => a.y - b.y || a.x - b.x);
      const fullTextItems = sortedItems.map(item => item.text).join(' ');
      
      // Check which days appear in the text
      const daysInText = daysOfWeek.filter(day => 
        new RegExp(`\\b${day}\\b`, 'i').test(fullTextItems)
      );
      console.log('Days found in text:', daysInText);
      
      // Try to parse using the text-based approach for missing days
      daysInText.forEach(day => {
        if (!columns.has(day)) {
          columns.set(day, { classes: [], times: [] });
        }
      });
    }
    
    // Also build the full text for backward compatibility
    const fullText = allItems
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map(item => item.text)
      .join(' ');
    
    return { fullText, columns };
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error("Failed to extract text from PDF. The file may be too large or corrupted.");
  }
}

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({data: arrayBuffer});
    const pdf = await loadingTask.promise;
    
    let fullText = "";
    const maxPages = Math.min(pdf.numPages, 10); // Limit to 10 pages to prevent stack overflow
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => (item as any).str).join(" ");
        
        if (pageText.trim().length >= 20) {
          fullText += pageText + "\n\n";
        } else {
          // Skip OCR to avoid stack overflow issues
          fullText += `[Page ${pageNum} - Limited text content]\n\n`;
        }
      } catch (pageError) {
        console.error(`Error processing page ${pageNum}:`, pageError);
        fullText += `[Error processing page ${pageNum}]\n\n`;
      }
    }
    
    if (pdf.numPages > maxPages) {
      fullText += `[Note: Only processed first ${maxPages} pages to prevent memory issues]\n\n`;
    }
    
    return fullText.trim() || "No text content could be extracted from the PDF.";
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error("Failed to extract text from PDF. The file may be too large or corrupted.");
  }
}

async function ocrPage(page: any): Promise<string> {
    try {
        // Use a smaller scale to reduce memory usage
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) {
            return "";
        }
        
        // Limit canvas size to prevent memory issues
        const maxDimension = 2000;
        let scale = 1;
        if (viewport.width > maxDimension || viewport.height > maxDimension) {
            scale = Math.min(maxDimension / viewport.width, maxDimension / viewport.height);
        }
        
        canvas.width = viewport.width * scale;
        canvas.height = viewport.height * scale;
        
        // Set a timeout to prevent long-running operations
        const renderPromise = page.render({ 
            canvasContext: context, 
            viewport: new page.getViewport({ scale: 1.5 * scale })
        }).promise;
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('OCR render timeout')), 10000);
        });
        
        await Promise.race([renderPromise, timeoutPromise]);
        
        // Use a timeout for OCR as well
        const ocrPromise = Tesseract.recognize(
            canvas,
            "eng",
            { logger: m => {}, errorHandler: err => console.error('Tesseract error:', err) }
        );
        
        const ocrTimeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('OCR processing timeout')), 15000);
        });
        
        const result = await Promise.race([ocrPromise, ocrTimeoutPromise]) as { data: { text: string } };
        const text = result?.data?.text || '';
        
        // Clean up to prevent memory leaks
        canvas.width = 1;
        canvas.height = 1;
        
        return text;
    } catch (error) {
        console.error('OCR processing error:', error);
        return '[OCR processing failed]';
    }
}

// Visual OCR extraction with word-level bounding boxes for column detection
export async function extractWithVisualOCR(file: File): Promise<{
  fullText: string;
  columns: Map<string, { classes: string[]; times: string[] }>;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const columns = new Map<string, { classes: string[]; times: string[] }>();
  daysOfWeek.forEach(day => columns.set(day, { classes: [], times: [] }));
  
  let fullText = '';
  
  console.log(`PDF has ${pdf.numPages} pages`);
  
  // Process ALL pages
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    console.log(`\n=== Processing page ${pageNum} of ${pdf.numPages} ===`);
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
      
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) {
        console.error(`Failed to get canvas context for page ${pageNum}`);
        continue;
      }
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      console.log(`Rendering page ${pageNum} (${canvas.width}x${canvas.height})...`);
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      
      console.log(`Running OCR on page ${pageNum}...`);
      
      // Use Tesseract with word-level bounding boxes
      const result = await Tesseract.recognize(canvas, "eng", {
        logger: m => {
          if (m.status === 'recognizing text' && Math.round(m.progress * 100) % 20 === 0) {
            console.log(`Page ${pageNum} OCR: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      
      console.log(`Page ${pageNum} OCR complete. Text length: ${result.data.text.length}`);
      fullText += result.data.text + '\n\n';
      
      // Get word-level data with positions
      const words = result.data.words || [];
      console.log(`Found ${words.length} words on page ${pageNum}`);
      
      // Log first few words to debug
      if (words.length > 0) {
        const sampleWords = words.slice(0, 30).map((w: any) => w.text).join(', ');
        console.log(`Page ${pageNum} sample words:`, sampleWords);
      }
      
      // Find day headers and their X positions
      interface DayColumn {
        day: string;
        xMin: number;
        xMax: number;
        words: typeof words;
      }
      
      const dayPositions: DayColumn[] = [];
      
      words.forEach((word: any) => {
        const text = word.text?.trim() || '';
        const matchedDay = daysOfWeek.find(day => 
          day.toLowerCase() === text.toLowerCase() ||
          text.toLowerCase().startsWith(day.toLowerCase())
        );
        
        if (matchedDay && word.bbox) {
          console.log(`Page ${pageNum}: Found day header: ${matchedDay} at x=${word.bbox.x0}`);
          dayPositions.push({
            day: matchedDay,
            xMin: word.bbox.x0 - 20,
            xMax: word.bbox.x0 + 300, // Wider default column
            words: []
          });
        }
      });
      
      // Remove duplicates - keep the one for THIS page only
      const uniqueDays = new Map<string, DayColumn>();
      dayPositions.forEach(dp => {
        // Only add if not already seen on this page
        if (!uniqueDays.has(dp.day)) {
          uniqueDays.set(dp.day, dp);
        }
      });
      
      const sortedColumns = Array.from(uniqueDays.values()).sort((a, b) => a.xMin - b.xMin);
      
      // Adjust column boundaries based on neighboring columns
      for (let i = 0; i < sortedColumns.length - 1; i++) {
        const gap = sortedColumns[i + 1].xMin - sortedColumns[i].xMin;
        sortedColumns[i].xMax = sortedColumns[i].xMin + gap - 10;
      }
      if (sortedColumns.length > 0) {
        sortedColumns[sortedColumns.length - 1].xMax = canvas.width;
      }
      
      // Validate column boundaries
      sortedColumns.forEach(col => {
        if (col.xMax <= col.xMin) {
          col.xMax = col.xMin + 300; // Fallback width
        }
      });
      
      console.log(`Page ${pageNum} columns:`, sortedColumns.map(c => `${c.day}: ${c.xMin.toFixed(0)}-${c.xMax.toFixed(0)}`).join(', '));
      
      // Assign words to columns based on X position
      words.forEach((word: any) => {
        if (!word.bbox) return;
        const wordX = word.bbox.x0;
        
        for (const col of sortedColumns) {
          if (wordX >= col.xMin && wordX < col.xMax) {
            col.words.push(word);
            break;
          }
        }
      });
      
      // Process each column to build lines and extract classes/times
      sortedColumns.forEach(col => {
        // Sort words by Y position (top to bottom), then X
        col.words.sort((a: any, b: any) => {
          const yDiff = a.bbox.y0 - b.bbox.y0;
          if (Math.abs(yDiff) < 15) { // Same line
            return a.bbox.x0 - b.bbox.x0;
          }
          return yDiff;
        });
        
        // Group words into lines
        const lines: string[] = [];
        let currentLine = '';
        let lastY = -1;
        
        col.words.forEach((word: any) => {
          const text = word.text?.trim() || '';
          if (!text) return;
          
          if (lastY === -1 || Math.abs(word.bbox.y0 - lastY) < 15) {
            currentLine += (currentLine ? ' ' : '') + text;
          } else {
            if (currentLine) lines.push(currentLine);
            currentLine = text;
          }
          lastY = word.bbox.y0;
        });
        if (currentLine) lines.push(currentLine);
        
        console.log(`${col.day} lines:`, lines.slice(0, 10));
        
        // Extract classes and times from lines
        const dayData = columns.get(col.day) || { classes: [], times: [] };
        
        lines.forEach(line => {
          // Skip the day header itself
          if (daysOfWeek.some(d => line.toLowerCase() === d.toLowerCase())) return;
          
          // Check if it's just a time (various formats)
          const timeOnlyMatch = line.match(/^(\d{1,4})\s*(?:AM|PM)$|^(\d{1,2}[:.]\d{2})\s*(?:AM|PM)?$/i);
          if (timeOnlyMatch) {
            const timeStr = timeOnlyMatch[1] || timeOnlyMatch[2];
            let formattedTime = timeStr;
            
            // Handle formats like "730AM" or "1030AM"
            if (/^\d{3,4}$/.test(timeStr)) {
              if (timeStr.length === 3) {
                formattedTime = `${timeStr[0]}:${timeStr.slice(1)}`;
              } else if (timeStr.length === 4) {
                formattedTime = `${timeStr.slice(0, 2)}:${timeStr.slice(2)}`;
              }
            }
            
            const normalized = normalizeTime(formattedTime + ' ' + line.match(/AM|PM/i)?.[0]);
            if (normalized) dayData.times.push(normalized);
            return;
          }
          
          // Try to find ALL class-trainer patterns in the line (handles merged classes)
          // Pattern: ClassName - TrainerName (possibly with time prefix)
          const allClassMatches = line.matchAll(/(?:[\d:]+\s*(?:AM|PM)?\s*)?([A-Za-z0-9\s\(\)]+?)\s*[-–—]\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)/gi);
          
          let foundAny = false;
          const matchesArray = Array.from(allClassMatches);
          for (const match of matchesArray) {
            const rawClass = match[1].trim();
            const trainer = match[2].trim().split(/\s+/)[0]; // Take first word as trainer name
            
            if (trainer.length >= 3 && !/^(AM|PM|EXPRESS|FULL|BODY|PUSH|PULL|LAB)$/i.test(trainer)) {
              // Clean up the class name - remove leading time if present
              const cleanedClass = rawClass.replace(/^\d{1,2}[:.]\d{2}\s*(?:AM|PM)?\s*/i, '').trim();
              if (cleanedClass.length > 2) {
                dayData.classes.push(`${cleanedClass} - ${trainer}`);
                foundAny = true;
              }
            }
          }
          
          // Also extract times from mixed lines - handle various time formats
          if (!foundAny || line.match(/\d{1,2}[:.]\d{2}\s*(?:AM|PM)/i)) {
            // Match standard times with colons
            const timeMatches = Array.from(line.matchAll(/(\d{1,2}[:.]\d{2}\s*(?:AM|PM))/gi));
            for (const tm of timeMatches) {
              const normalized = normalizeTime(tm[1]);
              if (normalized && !dayData.times.includes(normalized)) {
                dayData.times.push(normalized);
              }
            }
            
            // Also match compact times without colons like "730AM"
            const compactTimeMatches = Array.from(line.matchAll(/(\d{3,4})(\s*(?:AM|PM))/gi));
            for (const ctm of compactTimeMatches) {
              const timeNum = ctm[1];
              const period = ctm[2].trim();
              let formattedTime = '';
              
              if (timeNum.length === 3) {
                formattedTime = `${timeNum[0]}:${timeNum.slice(1)} ${period}`;
              } else if (timeNum.length === 4) {
                formattedTime = `${timeNum.slice(0, 2)}:${timeNum.slice(2)} ${period}`;
              }
              
              if (formattedTime) {
                const normalized = normalizeTime(formattedTime);
                if (normalized && !dayData.times.includes(normalized)) {
                  dayData.times.push(normalized);
                }
              }
            }
          }
        });
        
        columns.set(col.day, dayData);
      });
      
      // Clean up
      canvas.width = 1;
      canvas.height = 1;
      
    } catch (error) {
      console.error(`Error processing page ${pageNum}:`, error);
    }
  }
  
  // Log final results
  columns.forEach((data, day) => {
    console.log(`${day}: ${data.classes.length} classes, ${data.times.length} times`);
  });
  
  return { fullText, columns };
}

// Helper function to extract classes from content
function extractClassesFromContent(content: string): { time: string; className: string; trainer: string; theme?: string }[] {
  const classes: { time: string; className: string; trainer: string; theme?: string }[] = [];
  
  // Match time values - improved regex to handle various formats like "5:00PM", "5:00 PM", "5.00PM"
  const timeRegex = /(\d{1,2}[:.\s]?\d{0,2}\s*(?:AM|PM))/gi;
  const times: string[] = [];
  let timeMatch;
  
  while ((timeMatch = timeRegex.exec(content)) !== null) {
    const normalizedTime = normalizeTime(timeMatch[1]);
    if (normalizedTime && normalizedTime.match(/\d{1,2}:\d{2}\s*[AP]M/i)) {
      times.push(normalizedTime);
    }
  }
  
  // Match class-trainer pairs using refined regex
  // Updated regex to better handle special class names and various formats
  const classTrainerRegex = /([A-Za-z0-9\s\(\)\'\!\+\/\-\&]+?)\s*[-–—]\s*([A-Za-z]+)/g;
  let classTrainerMatch;
  const classTrainers: { className: string; trainer: string; theme?: string }[] = [];
  
  while ((classTrainerMatch = classTrainerRegex.exec(content)) !== null) {
    let trainerName = classTrainerMatch[2].trim();
    
    // Skip if trainer name is too short or looks like a class type
    if (trainerName.length < 3) continue;
    if (/^(AM|PM|EXPRESS|FULL|BODY|PUSH|PULL|LAB)$/i.test(trainerName)) continue;
    
    // Normalize teacher name
    trainerName = normalizeTeacherName(trainerName);
    
    // Get the raw class name before normalization
    const rawClassName = classTrainerMatch[1].trim();
    
    // Skip if class name is empty or just whitespace
    if (!rawClassName || rawClassName.length < 2) continue;
    
    // Handle special theme classes that might be misidentified
    let className = rawClassName;
    let theme = '';
    
    // Extract theme information from special classes
    if (rawClassName.includes("SLAY") || 
        rawClassName.includes("GLUTES") || 
        rawClassName.includes("GALORE") || 
        rawClassName.includes("BATTLE OF THE BANDS") ||
        rawClassName.includes("DRAKE VS RIHANNA") ||
        rawClassName.includes("BEAT THE TRAINER") ||
        rawClassName.includes("7 YEARS STRONG") ||
        /[A-Z]{3,}\s+(VS|&)\s+[A-Z]{3,}/i.test(rawClassName)) {
      
      // Extract theme from the raw class name
      if (rawClassName.includes("DRAKE VS RIHANNA")) {
        theme = "DRAKE VS RIHANNA";
      } else if (rawClassName.includes("BATTLE OF THE BANDS")) {
        theme = "BATTLE OF THE BANDS";
      } else if (rawClassName.includes("BEAT THE TRAINER")) {
        theme = "BEAT THE TRAINER";
      } else if (rawClassName.includes("7 YEARS STRONG")) {
        theme = "7 YEARS STRONG";
      } else if (rawClassName.includes("GLUTES") && rawClassName.includes("GALORE")) {
        theme = "GLUTES GALORE";
      } else if (rawClassName.includes("SLAY")) {
        theme = "SLAY SUNDAY";
      } else {
        const themeMatch = rawClassName.match(/([A-Z]{2,}\s+(?:VS|&)\s+[A-Z]{2,})/i);
        if (themeMatch) {
          theme = themeMatch[1];
        }
      }
      
      // For these special classes, try to identify the base class type
      if (rawClassName.includes("BARRE")) {
        className = "Studio Barre 57";
      } else if (rawClassName.includes("MAT")) {
        className = "Studio Mat 57";
      } else {
        className = matchClassName(rawClassName);
      }
    } else {
      // Normal class name normalization
      className = matchClassName(rawClassName);
    }

    classTrainers.push({
      className: className,
      trainer: trainerName,
      theme: theme || undefined
    });
  }
  
  // Match times with class-trainer pairs
  const count = Math.min(times.length, classTrainers.length);
  for (let i = 0; i < count; i++) {
    const classEntry: { time: string; className: string; trainer: string; theme?: string } = {
      time: times[i],
      className: classTrainers[i].className,
      trainer: classTrainers[i].trainer
    };
    
    if (classTrainers[i].theme) {
      classEntry.theme = classTrainers[i].theme;
    }
    
    classes.push(classEntry);
  }
  
  return classes;
}

// Advanced parser for column-based PDF schedules
// This handles OCR output where times are listed AFTER class-trainer pairs
function parseColumnBasedSchedule(fullText: string): Map<string, { time: string; className: string; trainer: string; theme?: string }[]> {
  const daySchedules = new Map<string, { time: string; className: string; trainer: string; theme?: string }[]>();
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  
  // Initialize all days
  daysOfWeek.forEach(day => daySchedules.set(day, []));
  
  // Split by lines for better analysis
  const lines = fullText.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
  
  console.log('=== COLUMN PARSER ===');
  console.log('Total lines:', lines.length);
  
  // Find all day headers and their line positions
  const dayLinePositions: { day: string; lineIndex: number; charPos: number }[] = [];
  lines.forEach((line, idx) => {
    daysOfWeek.forEach(day => {
      const match = new RegExp(`\\b${day}\\b`, 'i').exec(line);
      if (match) {
        dayLinePositions.push({ day, lineIndex: idx, charPos: match.index });
      }
    });
  });
  
  // Sort by line index first, then by character position within line
  dayLinePositions.sort((a, b) => {
    if (a.lineIndex !== b.lineIndex) return a.lineIndex - b.lineIndex;
    return a.charPos - b.charPos;
  });
  
  console.log('Day line positions:', dayLinePositions.map(d => `${d.day}@line${d.lineIndex}:${d.charPos}`).join(', '));
  
  // If no day headers found, try the full text approach
  if (dayLinePositions.length === 0) {
    console.log('No day headers found in line-by-line analysis');
    return daySchedules;
  }
  
  // Group days that appear on the same line (side-by-side columns)
  const lineGroups = new Map<number, typeof dayLinePositions>();
  dayLinePositions.forEach(pos => {
    const existing = lineGroups.get(pos.lineIndex) || [];
    existing.push(pos);
    lineGroups.set(pos.lineIndex, existing);
  });
  
  // For days on the same line, we need to split the content horizontally
  // Process each day section
  for (let i = 0; i < dayLinePositions.length; i++) {
    const current = dayLinePositions[i];
    
    // Find the next day that's on a DIFFERENT line
    let nextLineIdx = lines.length;
    for (let j = i + 1; j < dayLinePositions.length; j++) {
      if (dayLinePositions[j].lineIndex > current.lineIndex) {
        nextLineIdx = dayLinePositions[j].lineIndex;
        break;
      }
    }
    
    // Get all lines between this day header line and the next day's line
    const dayLines = lines.slice(current.lineIndex + 1, nextLineIdx);
    
    // Check if there are multiple days on the current line (side-by-side columns)
    const sameLineDays = lineGroups.get(current.lineIndex) || [];
    
    if (sameLineDays.length === 2) {
      // Two days on same line - split each content line at the second time occurrence
      const myIndex = sameLineDays.findIndex(d => d.day === current.day);
      
      const columnLines: string[] = [];
      for (const line of dayLines) {
        // Find all time patterns in the line
        const timePattern = /\d{1,2}[:.]\d{2}\s*(?:AM|PM)/gi;
        const matches: { index: number; match: string }[] = [];
        let m;
        while ((m = timePattern.exec(line)) !== null) {
          matches.push({ index: m.index, match: m[0] });
        }
        
        if (matches.length >= 2) {
          // Split at the second time (start of right column)
          const splitPoint = matches[1].index;
          
          if (myIndex === 0) {
            // First column - take everything before the second time
            const portion = line.substring(0, splitPoint).trim();
            if (portion) columnLines.push(portion);
          } else {
            // Second column - take everything from the second time onwards
            const portion = line.substring(splitPoint).trim();
            if (portion) columnLines.push(portion);
          }
        } else if (matches.length === 1) {
          // Only one time - try to determine which column this belongs to
          const timePos = matches[0].index;
          const midPoint = line.length / 2;
          
          if (myIndex === 0 && timePos < midPoint) {
            columnLines.push(line.trim());
          } else if (myIndex === 1 && timePos >= midPoint) {
            columnLines.push(line.trim());
          }
        } else {
          // No times found - skip or split by midpoint
          const midPoint = Math.floor(line.length / 2);
          if (myIndex === 0) {
            const portion = line.substring(0, midPoint).trim();
            if (portion && portion.length > 3) columnLines.push(portion);
          } else {
            const portion = line.substring(midPoint).trim();
            if (portion && portion.length > 3) columnLines.push(portion);
          }
        }
      }
      
      console.log(`Processing ${current.day} (column ${myIndex + 1}/2): ${columnLines.length} lines`);
      console.log(`  Sample lines: ${columnLines.slice(0, 3).join(' | ')}`);
      processLinesForDay(current.day, columnLines, daySchedules, daysOfWeek);
    } else if (sameLineDays.length > 2) {
      // More than 2 days on same line - use proportional splitting
      const myIndex = sameLineDays.findIndex(d => d.day === current.day);
      const columnWidth = 1 / sameLineDays.length;
      
      const columnLines: string[] = [];
      for (const line of dayLines) {
        const startPos = Math.floor(line.length * myIndex * columnWidth);
        const endPos = Math.floor(line.length * (myIndex + 1) * columnWidth);
        const portion = line.substring(startPos, endPos).trim();
        if (portion && portion.length > 3) columnLines.push(portion);
      }
      
      console.log(`Processing ${current.day} (column ${myIndex + 1}/${sameLineDays.length}): ${columnLines.length} lines`);
      processLinesForDay(current.day, columnLines, daySchedules, daysOfWeek);
    } else {
      console.log(`Processing ${current.day}: ${dayLines.length} lines`);
      processLinesForDay(current.day, dayLines, daySchedules, daysOfWeek);
    }
  }
  
  return daySchedules;
}

// NEW: Function to clean and split merged rows (handles combined day data)
function cleanAndSplitMergedRow(line: string): { entries: { time: string; className: string; trainer: string }[] } {
  // Remove garbage patterns commonly found in OCR
  line = line.replace(/KEMPS\s*CORNER/gi, '');
  line = line.replace(/November\s+\d+(?:st|nd|rd|th)\s*[-–—]\s*November\s+\d+(?:st|nd|rd|th)\s+\d{4}/gi, '');
  line = line.replace(/BEGINNER\s*:/gi, '');
  line = line.replace(/INTERMEDIATE\s*:/gi, '');
  line = line.replace(/ADVANCED\s*:/gi, '');
  line = line.replace(/BARRE\s+57\s*,\s*powerCycle/gi, '');
  line = line.replace(/CARDIO\s+BARRE\s*,.*?powerCycle/gi, '');
  line = line.replace(/HIIT\s*,\s*AMPED\s+UP!/gi, '');
  line = line.replace(/STUDIO\s*SCHEDULE/gi, '');
  line = line.replace(/TaBaTA/gi, '');
  line = line.replace(/TaatA/gi, '');
  line = line.replace(/ICY\s+ISOMETRIC/gi, '');
  
  // Remove standalone garbage strings
  line = line.replace(/\bHEDLLY\s+EREIDEAEES\s+ol\b/gi, '');
  line = line.replace(/\bSELT\s+Y\s+RISy\b/gi, '');
  line = line.replace(/\b[A-Z]{2,}\s+[A-Z]{2,}\s+\d+\s+[a-z]+\s+[a-z]+\s+[a-z]+\b/gi, '');
  line = line.replace(/\b\d{3,4}\s+AU\s+\d+\s+[A-Za-z\s]+$/i, ''); // Remove "750 AU 57 Exr e ees M rigakeni"
  line = line.replace(/\)\s*$/g, ''); // Remove trailing parenthesis
  line = line.replace(/\s+_+\s*$/g, ''); // Remove trailing underscores
  line = line.replace(/\.\s*$/g, ''); // Remove trailing period
  
  // Clean up extra whitespace
  line = line.replace(/\s+/g, ' ').trim();
  
  const entries: { time: string; className: string; trainer: string }[] = [];
  
  if (!line) return { entries };
  
  // STRATEGY: Split by " - " to find TIME CLASS - TRAINER segments
  // This identifies natural boundaries between entries
  const parts = line.split(/\s*[-–—]\s*/);
  
  // Process parts to extract complete entries
  // Pattern: "TIME CLASS" - "TRAINER TIME CLASS" - "TRAINER" ...
  if (parts.length >= 2) {
    let i = 0;
    
    while (i < parts.length - 1) {
      const currentPart = parts[i].trim();
      const nextPart = parts[i + 1].trim();
      
      if (!currentPart || !nextPart) {
        i++;
        continue;
      }
      
      // Extract time from currentPart
      const timeMatch = currentPart.match(/^(\d{1,2}[:.]?\d{0,2}\s*(?:AM|PM))/i);
      if (!timeMatch) {
        // No time found, skip this part
        i++;
        continue;
      }
      
      const rawTime = timeMatch[1];
      const normalizedTime = normalizeTime(rawTime);
      
      if (!normalizedTime) {
        i++;
        continue;
      }
      
      // Extract class name from currentPart (everything after the time)
      let rawClassName = currentPart.replace(/^\d{1,2}[:.]?\d{0,2}\s*(?:AM|PM)\s*/i, '').trim();
      
      // Check if nextPart contains another time (meaning it's "TRAINER TIME CLASS")
      const nextTimeMatch = nextPart.match(/^([A-Za-z]+)\s+(\d{1,2}[:.]?\d{0,2}\s*(?:AM|PM))/i);
      
      let trainerName = '';
      
      if (nextTimeMatch) {
        // nextPart is "TRAINER TIME CLASS" - extract just the trainer
        trainerName = nextTimeMatch[1];
        
        // Insert the "TIME CLASS" back into parts array for next iteration
        const remainingText = nextPart.substring(nextTimeMatch[1].length).trim();
        parts[i + 1] = remainingText;
        // Don't increment i - we'll process the remaining text in next iteration
      } else {
        // nextPart is just "TRAINER" - consume it
        trainerName = nextPart.split(/\s+/)[0]; // Take first word only
        i++; // Move past the trainer part
      }
      
      // Clean up class name
      rawClassName = rawClassName.replace(/\b[A-Z]{2}\s+\d+\s+[A-Za-z]+.*$/i, '');
      rawClassName = rawClassName.replace(/\s+\d{3,}\s+.*$/i, '');
      if (rawClassName.includes('(') && !rawClassName.includes(')')) {
        rawClassName = rawClassName + ')';
      }
      rawClassName = rawClassName.replace(/\)\s+.*$/g, ')');
      rawClassName = rawClassName.replace(/\s*_+.*$/g, '');
      rawClassName = rawClassName.trim();
      
      // Validate trainer
      if (trainerName.length < 3 || /^(AM|PM|EXPRESS|FULL|BODY|PUSH|PULL|LAB|BARRE|CYCLE|MAT)$/i.test(trainerName)) {
        i++;
        continue;
      }
      
      // Normalize
      trainerName = normalizeTeacherName(trainerName);
      const className = matchClassName(rawClassName);
      
      if (className && isValidClassName(className)) {
        entries.push({ time: normalizedTime, className, trainer: trainerName });
        console.log(`    Extracted: ${normalizedTime} ${className} - ${trainerName}`);
      }
      
      // Move to next segment
      i++;
    }
  }
  
  return { entries };
}

// Helper function to process lines for a specific day
function processLinesForDay(
  day: string,
  dayLines: string[],
  daySchedules: Map<string, { time: string; className: string; trainer: string; theme?: string }[]>,
  daysOfWeek: string[]
) {
  const entries: { time: string; className: string; trainer: string }[] = [];
  
  for (const line of dayLines) {
    // Skip if line is just a day name
    if (daysOfWeek.some(d => new RegExp(`^${d}$`, 'i').test(line))) continue;
    
    // Skip header lines
    if (/BEGINNER|INTERMEDIATE|ADVANCED|KEMPS|CORNER|STUDIO|SCHEDULE|November/i.test(line)) continue;
    
    // Primary pattern: TIME CLASS - Trainer (e.g., "7:15 AM STRENGTH (PULL) - Anisha")
    const fullPattern = /^(\d{1,2}[:.]\d{2}\s*(?:AM|PM)?)\s+(.+?)\s*[-–—]\s*([A-Za-z]+)$/i;
    const fullMatch = line.match(fullPattern);
    
    if (fullMatch) {
      const time = normalizeTime(fullMatch[1]);
      if (!time) continue;  // Invalid time
      
      let rawClassName = fullMatch[2].trim();
      let trainerName = fullMatch[3].trim();
      
      // Skip if trainer looks like part of class name
      if (/^(AM|PM|EXPRESS|FULL|BODY|PUSH|PULL|LAB)$/i.test(trainerName)) continue;
      
      // Skip if trainer name too short
      if (trainerName.length < 3) continue;
      
      trainerName = normalizeTeacherName(trainerName);
      const className = matchClassName(rawClassName);
      
      if (isValidClassName(className)) {
        entries.push({ time, className, trainer: trainerName });
        console.log(`  Complete entry: ${time} ${className} - ${trainerName}`);
      }
      continue;
    }
    
    // Alternative pattern for OCR errors like "730AM FT-Pramal" -> "7:30 AM FIT - Pranjali"
    // This handles missing colons in times
    const ocrPattern = /^(\d{1,2})(\d{2})\s*(AM|PM)\s+(.+?)\s*[-–—]\s*([A-Za-z]+)/i;
    const ocrMatch = line.match(ocrPattern);
    
    if (ocrMatch) {
      const time = normalizeTime(`${ocrMatch[1]}:${ocrMatch[2]} ${ocrMatch[3]}`);
      if (!time) continue;
      
      let rawClassName = ocrMatch[4].trim();
      let trainerName = ocrMatch[5].trim();
      
      if (trainerName.length < 3) continue;
      
      trainerName = normalizeTeacherName(trainerName);
      const className = matchClassName(rawClassName);
      
      if (isValidClassName(className)) {
        entries.push({ time, className, trainer: trainerName });
        console.log(`  OCR-corrected entry: ${time} ${className} - ${trainerName}`);
      }
      continue;
    }
    
    // Pattern for compact OCR format like "730AM FT-Pramal" or "8:30 AM MATS7 - Anisha"
    const compactPattern = /^(\d{1,4})\s*(AM|PM)\s+(.+?)\s*[-–—]\s*([A-Za-z]+)/i;
    const compactMatch = line.match(compactPattern);
    
    if (compactMatch) {
      // Parse the time number - could be 730 or 830 or 1030
      const timeNum = compactMatch[1];
      let timeStr = '';
      
      if (timeNum.length === 3) {
        // Format: 730 -> 7:30
        timeStr = `${timeNum[0]}:${timeNum.slice(1)} ${compactMatch[2]}`;
      } else if (timeNum.length === 4) {
        // Format: 1030 -> 10:30
        timeStr = `${timeNum.slice(0, 2)}:${timeNum.slice(2)} ${compactMatch[2]}`;
      } else {
        timeStr = `${timeNum}:00 ${compactMatch[2]}`;
      }
      
      const time = normalizeTime(timeStr);
      if (!time) continue;
      
      let rawClassName = compactMatch[3].trim();
      let trainerName = compactMatch[4].trim();
      
      if (trainerName.length < 3) continue;
      
      trainerName = normalizeTeacherName(trainerName);
      const className = matchClassName(rawClassName);
      
      if (isValidClassName(className)) {
        entries.push({ time, className, trainer: trainerName });
        console.log(`  Compact format entry: ${time} ${className} - ${trainerName}`);
      }
      continue;
    }
    
    // Pattern without proper dash: "6:00PM FIT-Atulan" or "6:00PM FIT Atulan"
    const noDashPattern = /^(\d{1,2}[:.]\d{2}\s*(?:AM|PM)?)\s+(.+?)[-\s]+([A-Z][a-z]+)$/i;
    const noDashMatch = line.match(noDashPattern);
    
    if (noDashMatch) {
      const time = normalizeTime(noDashMatch[1]);
      if (!time) continue;
      
      let rawClassName = noDashMatch[2].trim();
      let trainerName = noDashMatch[3].trim();
      
      // Skip if trainer looks like part of class name
      if (/^(AM|PM|Express|Full|Body|Push|Pull|Lab|Barre|Cycle)$/i.test(trainerName)) continue;
      
      if (trainerName.length < 3) continue;
      
      trainerName = normalizeTeacherName(trainerName);
      const className = matchClassName(rawClassName);
      
      if (isValidClassName(className)) {
        entries.push({ time, className, trainer: trainerName });
        console.log(`  NoDash entry: ${time} ${className} - ${trainerName}`);
      }
      continue;
    }
  }
  
  console.log(`  ${day}: ${entries.length} complete entries`);
  
  // Add all entries to the day
  const existingClasses = daySchedules.get(day) || [];
  existingClasses.push(...entries);
  daySchedules.set(day, existingClasses);
}

// NEW: Parse schedule from raw OCR text with merged day columns
export function parseScheduleFromRawOCR(rawText: string, location: string): PdfClassData[] {
  const schedule: PdfClassData[] = [];
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const normalizedLocation = normalizeLocation(location);
  
  console.log('=== RAW OCR PARSING START ===');
  console.log('Raw text length:', rawText.length);
  
  // Track unique entries to prevent duplicates
  const seenEntries = new Set<string>();
  
  // Clean and split by lines
  const lines = rawText.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
  
  // Remove header/garbage lines
  const cleanedLines = lines.filter(line => {
    // Skip location headers
    if (/^KEMPS\s*CORNER$/i.test(line)) return false;
    if (/^STUDIO\s*SCHEDULE$/i.test(line)) return false;
    if (/^Supreme\s*HQ$/i.test(line)) return false;
    if (/^BANDRA$/i.test(line)) return false;
    
    // Skip date headers
    if (/^November\s+\d+/i.test(line)) return false;
    if (/^December\s+\d+/i.test(line)) return false;
    if (/^January\s+\d+/i.test(line)) return false;
    if (/^\d+th\s*-\s*\d+th\s+\d{4}$/i.test(line)) return false;
    if (/^20\d{2}$/i.test(line)) return false;
    
    // Skip difficulty level headers
    if (/^BEGINNER\s*:/i.test(line)) return false;
    if (/^INTERMEDIATE\s*:/i.test(line)) return false;
    if (/^ADVANCED\s*:/i.test(line)) return false;
    
    // Skip class list lines (e.g., "BARRE 57, powerCycle")
    if (/^BARRE\s+57\s*,\s*powerCycle$/i.test(line)) return false;
    if (/^CARDIO\s+BARRE/i.test(line) && line.includes('powerCycle') && !line.match(/\d{1,2}[:.]?\d{0,2}\s*(?:AM|PM)/i)) return false;
    if (/^HIIT\s*,\s*AMPED/i.test(line)) return false;
    if (/^STRENGTH\s+LAB\s*,\s*powerCycle$/i.test(line)) return false;
    
    // Skip theme category lines
    if (/^TABATA$/i.test(line)) return false;
    if (/^ICY\s*ISOMETRIC$/i.test(line)) return false;
    if (/^SLAY\s*SUNDAY$/i.test(line)) return false;
    
    return true;
  });
  
  console.log(`Cleaned from ${lines.length} to ${cleanedLines.length} lines`);
  
  // Find day header lines (e.g., "MONDAY TUESDAY")
  const dayHeaderLines: { lineIndex: number; days: string[] }[] = [];
  
  cleanedLines.forEach((line, idx) => {
    const foundDays: string[] = [];
    daysOfWeek.forEach(day => {
      if (new RegExp(`\\b${day}\\b`, 'i').test(line)) {
        foundDays.push(day);
      }
    });
    
    if (foundDays.length > 0) {
      dayHeaderLines.push({ lineIndex: idx, days: foundDays });
      console.log(`Found day header at line ${idx}: ${foundDays.join(', ')}`);
    }
  });
  
  if (dayHeaderLines.length === 0) {
    console.warn('No day headers found in cleaned text');
    return [];
  }
  
  // Process each section between day headers
  for (let i = 0; i < dayHeaderLines.length; i++) {
    const currentHeader = dayHeaderLines[i];
    const nextHeader = dayHeaderLines[i + 1];
    
    const startIdx = currentHeader.lineIndex + 1;
    const endIdx = nextHeader ? nextHeader.lineIndex : cleanedLines.length;
    
    const sectionLines = cleanedLines.slice(startIdx, endIdx);
    const sectionDays = currentHeader.days;
    
    console.log(`\n=== Processing section for ${sectionDays.join(' & ')} ===`);
    console.log(`Lines in section: ${sectionLines.length}`);
    
    // Process each line in this section
    sectionLines.forEach((line, lineIdx) => {
      // Use the new cleanAndSplitMergedRow function
      const { entries } = cleanAndSplitMergedRow(line);
      
      if (entries.length > 0) {
        console.log(`Line ${lineIdx}: "${line}"`);
        console.log(`  Split into ${entries.length} entries`);
        
        // Assign entries to days based on number of days in header
        // Improved day assignment logic for merged rows:
        // 1) If entries length === number of days -> one-to-one mapping.
        // 2) If entries length is a multiple of days -> chunk mapping (round-robin per group).
        // 3) Otherwise assign using modulo (round-robin) to avoid dumping all extras into last day.
        const totalEntries = entries.length;
        const dayCount = sectionDays.length;
        const chunkSize = dayCount > 0 ? Math.floor(totalEntries / dayCount) : 0;

        entries.forEach((entry, entryIdx) => {
          let assignedDay: string;
          if (dayCount <= 1) {
            assignedDay = sectionDays[0];
          } else if (totalEntries === dayCount) {
            assignedDay = sectionDays[entryIdx];
          } else if (dayCount > 1 && totalEntries % dayCount === 0) {
            // Group entries into day-aligned chunks
            const groupIndex = Math.floor(entryIdx / chunkSize);
            assignedDay = sectionDays[Math.min(groupIndex, dayCount - 1)];
          } else {
            // Round-robin distribution
            assignedDay = sectionDays[entryIdx % dayCount];
          }
          
          const uniqueKey = (assignedDay + entry.time + entry.className + entry.trainer + normalizedLocation)
            .toLowerCase()
            .replace(/\s+/g, "");
          
          // Check for duplicates
          if (seenEntries.has(uniqueKey)) {
            console.log(`  ⚠️  Skipping duplicate: ${assignedDay} ${entry.time} ${entry.className} - ${entry.trainer}`);
            return;
          }
          
          seenEntries.add(uniqueKey);
          
          schedule.push({
            day: assignedDay,
            time: entry.time,
            className: entry.className,
            trainer: entry.trainer,
            location: normalizedLocation,
            uniqueKey
          });
          
          console.log(`  ✓ ${assignedDay}: ${entry.time} ${entry.className} - ${entry.trainer}`);
        });
      }
    });
  }
  
  console.log('=== RAW OCR PARSING COMPLETE ===');
  console.log(`Total classes parsed: ${schedule.length}`);
  
  // Sort the schedule by day (following week order) and then by time
  const dayOrder = { 
    'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 
    'Friday': 5, 'Saturday': 6, 'Sunday': 7 
  };
  
  schedule.sort((a, b) => {
    // First sort by day
    const dayDiff = dayOrder[a.day as keyof typeof dayOrder] - dayOrder[b.day as keyof typeof dayOrder];
    if (dayDiff !== 0) return dayDiff;
    
    // Then sort by time
    const timeA = convertTo24Hour(a.time);
    const timeB = convertTo24Hour(b.time);
    return timeA - timeB;
  });
  
  console.log('Schedule sorted by day and time');
  
  return schedule;
}

// Helper function to convert 12-hour time to minutes for sorting
function convertTo24Hour(time: string): number {
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
}

// Extract individual class entries from day content
export function parseScheduleFromPdfText(fullText: string, location: string): PdfClassData[] {
  const schedule: PdfClassData[] = [];
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Normalize the location
  const normalizedLocation = normalizeLocation(location);
  
  console.log('=== PDF PARSING START ===');
  console.log('Full text length:', fullText.length);
  console.log('Location:', normalizedLocation);

  // First, try to detect if this is a column-based schedule by checking for day headers
  const dayHeaderPattern = new RegExp(`\\b(${daysOfWeek.join('|')})\\b`, 'gi');
  const dayMatches = fullText.match(dayHeaderPattern) || [];
  console.log('Days found in text:', dayMatches);
  
  // Detect if this is a merged column format (multiple days on same line with combined data)
  const lines = fullText.split(/\n/);
  let multipleDaysOnSameLine = false;
  for (const line of lines) {
    const daysInLine = daysOfWeek.filter(day => new RegExp(`\\b${day}\\b`, 'i').test(line));
    if (daysInLine.length >= 2) {
      multipleDaysOnSameLine = true;
      console.log('Detected merged column format (multiple days on same line)');
      break;
    }
  }
  
  // If we detected merged columns, use the raw OCR parser
  if (multipleDaysOnSameLine) {
    console.log('✓ Using raw OCR parser for merged column format');
    const rawOcrSchedule = parseScheduleFromRawOCR(fullText, location);
    console.log('=== RAW OCR PARSER RESULTS ===');
    console.log(`Total classes parsed: ${rawOcrSchedule.length}`);
    if (rawOcrSchedule.length > 0) {
      return rawOcrSchedule;
    } else {
      console.warn('Raw OCR parser returned 0 classes, falling back to standard parser');
    }
  } else {
    console.log('No merged columns detected, using standard parser');
  }
  
  // Try the advanced column-based parser first
  const columnParsedSchedule = parseColumnBasedSchedule(fullText);
  let totalFromColumnParser = 0;
  columnParsedSchedule.forEach((classes, day) => {
    totalFromColumnParser += classes.length;
  });
  
  console.log('Column parser found:', totalFromColumnParser, 'classes');
  
  // If column parser found enough classes, use it
  if (totalFromColumnParser > 5) {
    columnParsedSchedule.forEach((classes, day) => {
      classes.forEach(({ time, className, trainer, theme }) => {
        if (!isValidClassName(className)) {
          return;
        }
        
        const uniqueKey = (day + time + className + trainer + normalizedLocation)
          .toLowerCase()
          .replace(/\s+/g, "");

        const scheduleItem: PdfClassData = {
          day,
          time,
          className,
          trainer,
          location: normalizedLocation,
          uniqueKey
        };
        
        if (theme && theme.trim()) {
          scheduleItem.theme = theme.trim();
        }

        schedule.push(scheduleItem);
      });
    });
    
    console.log('=== COLUMN PARSER RESULTS ===');
    console.log('Total classes:', schedule.length);
    return schedule;
  }

  // Fallback to original parsing logic
  console.log('=== FALLING BACK TO ORIGINAL PARSER ===');
  
  // Find the first day in the OCR text
  const firstDayMatch = fullText.match(new RegExp(`\\b(${daysOfWeek.join("|")})\\b`, "i"));
  if (!firstDayMatch) {
    console.warn("No valid day found in the OCR data.");
    return [];
  }

  // Extract text starting from the first day
  const startIndex = firstDayMatch.index || 0;
  const text = fullText.slice(startIndex);

  // Split the text into blocks for each day
  const dayBlocks = text.split(new RegExp(`\\b(?=${daysOfWeek.join("|")}\\b)`, "i"));
  
  console.log('Day blocks found:', dayBlocks.length);
  
  // Store processed content by day for later use
  const processedContentByDay: Record<string, { content: string, classes: any[] }> = {};
  
  // Process each day block
  dayBlocks.forEach((block, blockIndex) => {
    const dayMatch = block.match(new RegExp(`^(${daysOfWeek.join("|")}\\b)`, "i"));
    if (!dayMatch) {
      return;
    }

    const day = normalizeDay(dayMatch[1]);
    let content = block.slice(dayMatch[0].length).trim();

    // Clean up the content but preserve theme information
    let cleanContent = content.replace(/\s+/g, " ").trim();
    cleanContent = cleanContent
      .replace(/SLOGAN.*?(\.|$)/gi, "")
      .trim();

    // Extract classes for the day
    const classes = extractClassesFromContent(cleanContent);
    console.log(`Found ${classes.length} classes for ${day}`);
    
    // Store processed content and classes
    processedContentByDay[day.toLowerCase()] = {
      content: cleanContent,
      classes: classes
    };
  });
  
  // Add all classes to the schedule
  Object.entries(processedContentByDay).forEach(([day, { classes }]) => {
    classes.forEach(({ time, className, trainer, theme }) => {
      // Filter out invalid class names
      if (!isValidClassName(className)) {
        return;
      }
      
      const uniqueKey = (day + time + className + trainer + normalizedLocation)
        .toLowerCase()
        .replace(/\s+/g, "");

      const scheduleItem: PdfClassData = {
        day: day.charAt(0).toUpperCase() + day.slice(1),
        time,
        className,
        trainer,
        location: normalizedLocation,
        uniqueKey
      };
      
      // Add theme if it exists
      if (theme && theme.trim()) {
        scheduleItem.theme = theme.trim();
      }

      schedule.push(scheduleItem);
    });
  });
  
  console.log('=== FALLBACK PARSER RESULTS ===');
  console.log('Total classes:', schedule.length);

  return schedule;
}

// New function: Parse schedule directly from column-extracted data
export function parseScheduleFromColumns(
  columns: Map<string, { classes: string[]; times: string[] }>,
  location: string
): PdfClassData[] {
  const schedule: PdfClassData[] = [];
  const normalizedLocation = normalizeLocation(location);
  
  console.log('=== COLUMN-BASED PARSING ===');
  
  columns.forEach((data, day) => {
    console.log(`Processing ${day}: ${data.classes.length} classes, ${data.times.length} times`);
    
    const count = Math.min(data.classes.length, data.times.length);
    
    for (let i = 0; i < count; i++) {
      const classStr = data.classes[i];
      const time = data.times[i];
      
      // Parse class-trainer from the string
      const match = classStr.match(/^(.+?)\s*[-–—]\s*([A-Za-z]+)$/);
      if (!match) continue;
      
      const rawClassName = match[1].trim();
      let trainerName = match[2].trim();
      
      // Normalize
      trainerName = normalizeTeacherName(trainerName);
      const className = matchClassName(rawClassName);
      
      if (!isValidClassName(className)) continue;
      
      const uniqueKey = (day + time + className + trainerName + normalizedLocation)
        .toLowerCase()
        .replace(/\s+/g, "");
      
      schedule.push({
        day,
        time,
        className,
        trainer: trainerName,
        location: normalizedLocation,
        uniqueKey
      });
    }
    
    // Handle classes without times
    for (let i = count; i < data.classes.length; i++) {
      const classStr = data.classes[i];
      const match = classStr.match(/^(.+?)\s*[-–—]\s*([A-Za-z]+)$/);
      if (!match) continue;
      
      const rawClassName = match[1].trim();
      let trainerName = match[2].trim();
      
      trainerName = normalizeTeacherName(trainerName);
      const className = matchClassName(rawClassName);
      
      if (!isValidClassName(className)) continue;
      
      const uniqueKey = (day + 'TBD' + className + trainerName + normalizedLocation)
        .toLowerCase()
        .replace(/\s+/g, "");
      
      schedule.push({
        day,
        time: 'TBD',
        className,
        trainer: trainerName,
        location: normalizedLocation,
        uniqueKey
      });
    }
  });
  
  console.log('=== COLUMN PARSING RESULTS ===');
  console.log('Total classes:', schedule.length);
  
  return schedule;
}