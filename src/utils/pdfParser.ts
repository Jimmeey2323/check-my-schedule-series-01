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
  "Studio Strength Lab"
];

// Class name mappings for normalization
const classNameMappings: {[key: string]: string} = {
  // Strength Lab variations
  'STRENGTH LAB (FULL BODY)': 'Studio Strength Lab (Full Body)',
  'STRENGTH LAB (PULL)': 'Studio Strength Lab (Pull)',
  'STRENGTH LAB (PUSH)': 'Studio Strength Lab (Push)',
  'STRENGTH (PULL)': 'Studio Strength Lab (Pull)',
  'STRENGTH (PUSH)': 'Studio Strength Lab (Push)',
  
  // Other class name variations
  'Barre 57': 'Studio Barre 57',
  'Cardio Barre': 'Studio Cardio Barre',
  'Cardio Barre Plus': 'Studio Cardio Barre Plus',
  'Cardio Barre (Express)': 'Studio Cardio Barre Express',
  'Foundations': 'Studio Foundations',
  'Mat 57': 'Studio Mat 57',
  'Mat 57 (Express)': 'Studio Mat 57 Express',
  'Fit': 'Studio FIT',
  'Back Body Blaze': 'Studio Back Body Blaze',
  'Back Body Blaze (Express)': 'Studio Back Body Blaze Express',
  'Sweat in 30': 'Studio SWEAT In 30',
  'Recovery': 'Studio Recovery',
  'Pre/Post Natal': 'Studio Pre/Post Natal',
  'HIIT': 'Studio HIIT',
  'Amped Up!': 'Studio Amped Up!',
  "Trainer's Choice": 'Studio Trainer\'s Choice',
  'PowerCycle': 'Studio PowerCycle',
  'PowerCycle (Express)': 'Studio PowerCycle Express',
  'Hosted Class': 'Studio Hosted Class'
};

// Normalized teacher names
const normalizedTeacherNames = [
  "Anisha Shah", "Atulan Purohit", "Janhavi Jain", "Karanvir Bhatia", "Karan Bhatia", 
  "Mrigakshi Jaiswal", "Pranjali Jain", "Reshma Sharma", "Richard D'Costa", 
  "Rohan Dahima", "Upasna Paranjpe", "Karan Bhatia", "Saniya Jaiswal", 
  "Vivaran Dhasmana", "Nishanth Raj", "Cauveri Vikrant", "Kabir Varma", 
  "Simonelle De Vitre", "Simran Dutt", "Anmol Sharma", "Bret Saldanha", 
  "Raunak Khemuka", "Kajol Kanchan", "Pushyank Nahar", "Shruti Kulkarni", 
  "Vivaran Dhasmana", "Shruti Suresh", "Poojitha Bhaskar", "Siddhartha Kusuma", 
  "Chaitanya Nahar", "Veena Narasimhan"
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
  "Mrigakshi": "Mrigakshi Jaiswal",
  "Janhavi": "Janhavi Jain",
  "Atulan": "Atulan Purohit",
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
  
  // First normalize spaces around colons, commas, and dots BEFORE pattern matching
  time = time.replace(/\s*[:,.]\s*/g, ':');
  
  // Pattern to match complete time format: digits, colon, digits, space, AM/PM
  const completeTimePattern = /\d{1,2}:\d{0,2}\s*(AM|PM)/gi;
  const timeMatches = time.match(completeTimePattern) || [];
  
  if (timeMatches.length > 1) {
    // Multiple complete times found - take the first one
    time = timeMatches[0];
  } else if (timeMatches.length === 1) {
    // Single complete time found
    time = timeMatches[0];
  } else {
    // Try a broader pattern that includes malformed times
    const broadTimePattern = /\d{1,2}[.:,]?\d{0,2}\s*(AM|PM)/gi;
    const broadMatches = time.match(broadTimePattern) || [];
    
    if (broadMatches.length > 0) {
      time = broadMatches[0];
    } else {
      // No complete time pattern found, but maybe it's a malformed time
      // Check if it contains AM/PM somewhere
      const ampmMatch = time.match(/(AM|PM)/i);
      if (ampmMatch) {
        // Find the part with AM/PM and try to extract a reasonable time
        const ampmIndex = time.indexOf(ampmMatch[0]);
        // Look backward for numbers that could be the time
        const beforeAmPm = time.substring(0, ampmIndex).trim();
        const numbersBeforeAmPm = beforeAmPm.match(/[\d:,.]+$/);
        if (numbersBeforeAmPm) {
          time = numbersBeforeAmPm[0] + ' ' + ampmMatch[0];
        }
      }
    }
  }
  
  // Now normalize the selected time string
  // Replace commas with colons in time format (e.g., "7,15" -> "7:15")
  time = time.replace(/(\d),(\d)/g, '$1:$2');
  
  // Replace fullstops with colons in time strings (e.g., "7.15" -> "7:15")
  time = time.replace(/(\d)\.(\d)/g, '$1:$2');
  
  // Remove extra spaces around colons
  time = time.replace(/\s*:\s*/g, ':');
  
  // Ensure AM/PM is always preceded by a space
  time = time.replace(/(\d)(AM|PM)/gi, '$1 $2');
  
  // Handle cases where there might be multiple spaces before AM/PM
  time = time.replace(/\s+(AM|PM)/gi, ' $1');
  
  // Add missing minutes if only hour is provided (e.g., "7 AM" -> "7:00 AM")
  time = time.replace(/^(\d{1,2})\s+(AM|PM)$/gi, '$1:00 $2');
  
  // Validate the final time format
  const finalTimePattern = /^\d{1,2}:\d{2}\s+(AM|PM)$/i;
  if (!finalTimePattern.test(time)) {
    // If still not in proper format, try to salvage what we can
    const hourMatch = time.match(/(\d{1,2})/);
    const ampmMatch = time.match(/(AM|PM)/i);
    
    if (hourMatch && ampmMatch) {
      const hour = hourMatch[1];
      const ampm = ampmMatch[1].toUpperCase();
      time = `${hour}:00 ${ampm}`;
    } else {
      // Return empty if we can't make sense of it
      return '';
    }
  }
  
  return time.trim().toUpperCase();
}

// Helper function to clean concatenated promotional content from class names
function cleanConcatenatedContent(text: string): string {
  if (!text) return '';
  
  let cleaned = text.trim();
  
  // Define promotional phrases that commonly get concatenated
  const promotionalPhrases = [
    'SLAY GLUTES GALORE',
    'BATTLE OF THE BANDS',
    'BEAT THE TRAINER',
    '7 YEARS STRONG',
    'HALLOWEEN SPECIAL',
    'DIWALI SPECIAL',
    'CHRISTMAS SPECIAL',
    'NEW YEAR SPECIAL',
    'SUMMER SERIES',
    'WINTER SERIES',
    'THEMED CLASS',
    'SPECIAL EVENT',
    'MASTERCLASS',
    'WORKSHOP',
    'BOOTCAMP SERIES',
    'FITNESS FEST',
    'CELEBRATION',
    'CHALLENGE',
    'EXCLUSIVE',
    'LIMITED TIME',
    'ONE TIME ONLY',
    'GUEST TRAINER',
    'CELEBRITY CLASS',
    'INFLUENCER SESSION'
  ];
  
  // Remove promotional phrases (case insensitive)
  for (const phrase of promotionalPhrases) {
    const regex = new RegExp(phrase.replace(/\s+/g, '\\s*'), 'gi');
    cleaned = cleaned.replace(regex, ' ');
  }
  
  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Try to extract actual class names from the remaining text
  // Look for known class patterns at the end of the string
  const knownClassPatterns = [
    /\b(BARRE\s*57)\b/gi,
    /\b(CARDIO\s*BARRE(?:\s*(?:PLUS|EXPRESS))?)\b/gi,
    /\b(MAT\s*57(?:\s*EXPRESS)?)\b/gi,
    /\b(STRENGTH\s*LAB(?:\s*\([^)]+\))?)\b/gi,
    /\b(BACK\s*BODY\s*BLAZE(?:\s*EXPRESS)?)\b/gi,
    /\b(SWEAT\s*IN\s*30)\b/gi,
    /\b(TRAINER'S?\s*CHOICE)\b/gi,
    /\b(FOUNDATIONS)\b/gi,
    /\b(RECOVERY)\b/gi,
    /\b(PRE\/?POST\s*NATAL)\b/gi,
    /\b(HIIT)\b/gi,
    /\b(AMPED\s*UP!?)\b/gi,
    /\b(POWERCYCLE(?:\s*EXPRESS)?)\b/gi,
    /\b(STUDIO\s*FIT)\b/gi,
    /\b(HOSTED\s*CLASS)\b/gi
  ];
  
  // Try to find a known class pattern in the cleaned text
  for (const pattern of knownClassPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  
  return cleaned;
}

// Helper function to normalize class name
function matchClassName(text: string): string {
  if (!text) return '';
  
  // First clean any concatenated promotional content
  const cleanedText = cleanConcatenatedContent(text);
  if (!cleanedText) return '';
  
  // First check for exact mappings
  const trimmed = cleanedText.trim();
  for (const [key, value] of Object.entries(classNameMappings)) {
    if (trimmed.toUpperCase() === key.toUpperCase()) {
      return value;
    }
  }
  
  // Then use fuzzy matching for other classes
  const fuse = new Fuse(knownClassesList, { 
    includeScore: true, 
    threshold: 0.4, 
    ignoreLocation: true, 
    distance: 100 
  });
  
  const cleaned = trimmed.replace(/[\s\-_.]+/g, " ").trim();
  const result = fuse.search(cleaned);
  
  if (result.length > 0) {
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
  
  // Then use fuzzy matching for other names
  const fuse = new Fuse(normalizedTeacherNames, { 
    includeScore: true, 
    threshold: 0.4, 
    ignoreLocation: true, 
    distance: 100 
  });
  
  const result = fuse.search(trimmed);
  
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
  
  // Then use fuzzy matching for other locations
  const fuse = new Fuse(normalizedLocations, { 
    includeScore: true, 
    threshold: 0.4, 
    ignoreLocation: true, 
    distance: 100 
  });
  
  const result = fuse.search(trimmed);
  
  if (result.length > 0) {
    return result[0].item;
  }
  
  return trimmed;
}

// Helper function to check if a class name is valid (not a trainer name, theme, or invalid entry)
function isValidClassName(className: string): boolean {
  if (!className || className.trim() === '') return false;
  
  const trimmed = className.trim().toLowerCase();
  
  // List of theme names and promotional content that should be excluded
  const themeNames = [
    'slay glutes galore', 'battle of the bands', 'beat the trainer', '7 years strong',
    'halloween special', 'diwali special', 'christmas special', 'new year special',
    'summer series', 'winter series', 'monsoon series', 'festival special',
    'themed class', 'special event', 'pop up', 'outdoor session', 'workshop',
    'masterclass', 'celebration', 'challenge', 'bootcamp series', 'fitness fest',
    'anniversary special', 'birthday bash', 'community class', 'charity class',
    'beach session', 'park session', 'rooftop session', 'sunrise session',
    'sunset session', 'full moon', 'new moon', 'eclipse special', 'solstice',
    'equinox', 'valentine special', 'mothers day', 'fathers day', 'womens day',
    'international yoga day', 'world health day', 'fitness day', 'wellness week'
  ];
  
  // List of invalid class names that should be excluded
  const invalidNames = [
    'smita parekh', 'anandita', '2', 'hosted', '1', 'taarika', 'sakshi',
    'smita', 'parekh', 'anand', 'anandi', 'host', 'cover', 'replacement',
    'substitute', 'temp', 'guest', 'visiting', 'special guest', 'celebrity',
    'influencer', 'brand ambassador', 'collaboration', 'partnership',
    'sponsored by', 'presented by', 'in association with', 'powered by'
  ];
  
  // Check if the class name matches any theme names
  for (const theme of themeNames) {
    if (trimmed === theme || trimmed.includes(theme)) {
      return false;
    }
  }
  
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
  
  // Check if it contains too many uppercase words in sequence (likely promotional)
  const words = trimmed.split(' ');
  let uppercaseCount = 0;
  for (const word of words) {
    if (word === word.toUpperCase() && word.length > 2) {
      uppercaseCount++;
    }
  }
  if (uppercaseCount > 3) { // More than 3 uppercase words likely indicates promotional text
    return false;
  }
  
  // Check if it's likely a slogan or promotional phrase
  const promotionalPatterns = [
    /\b(slay|battle|crush|dominate|conquer|ultimate|supreme|epic|legendary)\b/i,
    /\b(galore|extravaganza|spectacular|magnificent|incredible|amazing)\b/i,
    /\b(challenge|competition|contest|tournament|championship)\b/i,
    /\b(exclusive|premium|deluxe|platinum|gold|silver|vip)\b/i,
    /\b(limited|special|unique|rare|one.time|once.in.a.lifetime)\b/i
  ];
  
  for (const pattern of promotionalPatterns) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }
  
  // Must contain at least one known class keyword to be valid
  const validClassKeywords = [
    'studio', 'barre', 'cardio', 'strength', 'mat', 'hiit', 'fit', 'cycle',
    'power', 'foundations', 'recovery', 'sweat', 'amped', 'trainer', 'choice',
    'express', 'plus', 'lab', 'full body', 'push', 'pull', 'blaze', 'back',
    'body', 'pre', 'post', 'natal', 'hosted', 'class'
  ];
  
  let hasValidKeyword = false;
  for (const keyword of validClassKeywords) {
    if (trimmed.includes(keyword)) {
      hasValidKeyword = true;
      break;
    }
  }
  
  return hasValidKeyword;
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
export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({data: arrayBuffer});
  const pdf = await loadingTask.promise;
  
  let fullText = "";
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => (item as any).str).join(" ");
    
    if (pageText.trim().length >= 20) {
      fullText += pageText + "\n\n";
    } else {
      // Fall back to OCR if text extraction didn't yield enough content
      const ocrText = await ocrPage(page);
      fullText += ocrText + "\n\n";
    }
  }
  
  // If still no text, try OCR on all pages
  if (!fullText.trim()) {
    fullText = "";
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const ocrText = await ocrPage(page);
      fullText += ocrText + "\n\n";
    }
  }
  
  return fullText.trim();
}

async function ocrPage(page: any): Promise<string> {
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
        return "";
    }
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport: viewport }).promise;

    const { data: { text } } = await Tesseract.recognize(
        canvas,
        "eng",
        { logger: m => {} }
    );

    // Debug log for OCR
    console.log(`OCR Output:`, text);

    return text;
}

export function parseScheduleFromPdfText(fullText: string, location: string): PdfClassData[] {
  const schedule: PdfClassData[] = [];
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Normalize the location
  const normalizedLocation = normalizeLocation(location);

  // Find the first day in the OCR text
  const firstDayMatch = fullText.match(new RegExp(`\\b(${daysOfWeek.join("|")})\\b`, "i"));
  if (!firstDayMatch) {
    console.warn("No valid day found in the OCR data.");
    return [];
  }

  // Extract text starting from the first day
  const startIndex = firstDayMatch.index || 0;
  let text = fullText.slice(startIndex);

  // More comprehensive pre-cleaning for concatenated promotional content
  const aggressivePromotionalPatterns = [
    // Handle repetitive promotional phrases
    /(?:SLAY\s*GLUTES?\s*GALORE\s*){1,}/gi,
    /(?:BATTLE\s*OF\s*THE\s*BANDS?\s*){2,}/gi, // Remove duplicates
    /(?:BEAT\s*THE\s*TRAINER\s*){1,}/gi,
    /(?:7\s*YEARS?\s*STRONG\s*){1,}/gi,
    
    // Handle concatenated promotional combinations
    /SLAY\s*GLUTES?\s*GALORE\s*BATTLE\s*OF\s*THE\s*BANDS?\s*BATTLE\s*OF\s*THE\s*BANDS?/gi,
    /BATTLE\s*OF\s*THE\s*BANDS?\s*SLAY\s*GLUTES?\s*GALORE/gi,
    /BEAT\s*THE\s*TRAINER\s*7\s*YEARS?\s*STRONG/gi,
    
    // Standard promotional patterns
    /HALLOWEEN\s*SPECIAL/gi,
    /DIWALI\s*SPECIAL/gi,
    /CHRISTMAS\s*SPECIAL/gi,
    /NEW\s*YEAR\s*SPECIAL/gi,
    /SUMMER\s*SERIES/gi,
    /WINTER\s*SERIES/gi,
    /THEMED?\s*CLASS/gi,
    /SPECIAL\s*EVENT/gi,
    /MASTERCLASS/gi,
    /WORKSHOP/gi,
    /BOOTCAMP\s*SERIES/gi,
    /FITNESS\s*FEST/gi,
    /CELEBRATION/gi,
    /CHALLENGE/gi,
    /EXCLUSIVE/gi,
    /LIMITED\s*TIME/gi,
    /ONE.TIME\s*ONLY/gi,
    
    // Marketing language patterns
    /(?:ULTIMATE|SUPREME|EPIC|LEGENDARY)\s+(?:CLASS|SESSION|EXPERIENCE)/gi,
    /(?:PREMIUM|DELUXE|PLATINUM)\s+(?:CLASS|SESSION|EXPERIENCE)/gi,
    /(?:EXCLUSIVE|VIP|MEMBERS?\s*ONLY)\s+(?:CLASS|SESSION|ACCESS)/gi
  ];

  for (const pattern of aggressivePromotionalPatterns) {
    text = text.replace(pattern, ' ');
  }

  // Normalize whitespace after aggressive cleaning
  text = text.replace(/\s+/g, ' ').trim();

  // Enhanced day boundary detection with better Saturday handling
  const dayBoundaryRegex = new RegExp(`\\b(${daysOfWeek.join("|")})\\b`, "gi");
  const dayMatches = [];
  let match;

  while ((match = dayBoundaryRegex.exec(text)) !== null) {
    dayMatches.push({
      day: match[1],
      index: match.index
    });
  }

  // Process each day with enhanced boundary isolation
  for (let i = 0; i < dayMatches.length; i++) {
    const currentDay = dayMatches[i];
    const nextDay = dayMatches[i + 1];
    
    const day = normalizeDay(currentDay.day);
    
    // Extract content for this specific day only
    const startPos = currentDay.index + currentDay.day.length;
    const endPos = nextDay ? nextDay.index : text.length;
    let dayContent = text.slice(startPos, endPos).trim();

    // Debug log for each day
    console.log(`Processing day: ${day}, content length: ${dayContent.length}`);

    // Additional cleanup for this day's content with special handling for weekends
    dayContent = dayContent
      .replace(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi, '') // Remove any day names that leaked in
      .replace(/^\s*-+\s*/, '') // Remove leading dashes
      .replace(/\s*-+\s*$/, '') // Remove trailing dashes
      .trim();

    // Special handling for Saturday and Sunday (weekend classes often have different formatting)
    if (day === 'Saturday' || day === 'Sunday') {
      console.log(`Special weekend processing for ${day}`);
      
      // Weekend-specific promotional content removal
      const weekendPromotionalPatterns = [
        /WEEKEND\s*SPECIAL/gi,
        /SATURDAY\s*SPECIAL/gi,
        /SUNDAY\s*SPECIAL/gi,
        /WEEKEND\s*WARRIOR/gi,
        /WEEKEND\s*INTENSIVE/gi,
        /WEEKEND\s*BOOTCAMP/gi
      ];
      
      for (const pattern of weekendPromotionalPatterns) {
        dayContent = dayContent.replace(pattern, ' ');
      }
    }

    // Final content normalization
    dayContent = dayContent
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    // Skip if content is too short to contain meaningful class information
    if (dayContent.length < 8) {
      console.log(`Skipping ${day} - content too short (${dayContent.length} chars)`);
      continue;
    }

    // Additional validation: check if the content seems to contain actual class information
    const hasTimePattern = /\d{1,2}[:.,]?\d{0,2}\s*(?:AM|PM)/i.test(dayContent);
    const hasClassPattern = /\b(?:STUDIO|BARRE|CARDIO|STRENGTH|MAT|HIIT|FIT|CYCLE|POWER|FOUNDATIONS|RECOVERY|SWEAT|AMPED|TRAINER|CHOICE|EXPRESS|PLUS|LAB|BLAZE|BACK|BODY|NATAL|HOSTED)\b/i.test(dayContent);
    
    if (!hasTimePattern && !hasClassPattern) {
      console.log(`Skipping ${day} - no recognizable class content`);
      continue;
    }

    // Extract classes for the day with improved parsing
    const classes = extractClassesFromDayContent(dayContent);
    console.log(`Found ${classes.length} classes for ${day}`);
    
    // Debug: log the actual classes found
    classes.forEach((cls, index) => {
      console.log(`  ${day} Class ${index + 1}: ${cls.time} - ${cls.className} - ${cls.trainer}`);
    });

    // Add classes to the schedule with enhanced validation
    classes.forEach(({ time, className, trainer }) => {
      // Enhanced filtering with multiple validation layers
      if (!isValidClassName(className)) {
        console.log(`Filtering out invalid class: "${className}"`);
        return;
      }
      
      // Additional check for minimum class name length
      if (className.trim().length < 4) {
        console.log(`Filtering out too short class name: "${className}"`);
        return;
      }
      
      // Check if class name still contains promotional content after all cleaning
      const stillHasPromotional = /\b(?:slay|battle|galore|crush|dominate|conquer|ultimate|supreme|epic|legendary|extravaganza|spectacular)\b/i.test(className);
      if (stillHasPromotional) {
        console.log(`Filtering out class with promotional content: "${className}"`);
        return;
      }
      
      const uniqueKey = (day + time + className + trainer + normalizedLocation)
        .toLowerCase()
        .replace(/\s+/g, "");

      schedule.push({
        day,
        time,
        className,
        trainer,
        location: normalizedLocation,
        uniqueKey
      });
    });
  }

  console.log(`Total schedule entries created: ${schedule.length}`);
  return schedule;
}

// Improved function to extract classes from day-specific content
function extractClassesFromDayContent(content: string): { time: string; className: string; trainer: string }[] {
  const classes: { time: string; className: string; trainer: string }[] = [];
  
  // Additional cleaning for concatenated promotional content
  let cleanedContent = content;
  
  // More aggressive cleaning patterns for concatenated content
  const concatenatedPatterns = [
    // Remove repetitive promotional phrases
    /(?:SLAY\s*GLUTES?\s*GALORE\s*){1,}/gi,
    /(?:BATTLE\s*OF\s*THE\s*BANDS?\s*){1,}/gi,
    /(?:BEAT\s*THE\s*TRAINER\s*){1,}/gi,
    /(?:7\s*YEARS?\s*STRONG\s*){1,}/gi,
    /(?:HALLOWEEN\s*SPECIAL\s*){1,}/gi,
    /(?:DIWALI\s*SPECIAL\s*){1,}/gi,
    
    // Remove common promotional concatenations
    /SLAY\s*GLUTES?\s*GALORE\s*BATTLE\s*OF\s*THE\s*BANDS?/gi,
    /BATTLE\s*OF\s*THE\s*BANDS?\s*SLAY\s*GLUTES?\s*GALORE/gi,
    /BEAT\s*THE\s*TRAINER\s*7\s*YEARS?\s*STRONG/gi,
    
    // Remove marketing phrases
    /(?:EXCLUSIVE|PREMIUM|DELUXE|ULTIMATE|SUPREME)\s+(?:CLASS|SESSION|EXPERIENCE)/gi,
    /(?:LIMITED|SPECIAL|UNIQUE|RARE)\s+(?:TIME|OFFER|CLASS)/gi,
    /(?:ONE.TIME|ONCE.IN.A.LIFETIME)\s+(?:ONLY|EXPERIENCE)/gi
  ];
  
  for (const pattern of concatenatedPatterns) {
    cleanedContent = cleanedContent.replace(pattern, ' ');
  }
  
  // Normalize whitespace
  cleanedContent = cleanedContent.replace(/\s+/g, ' ').trim();
  
  // More precise time matching to avoid false positives
  const timeRegex = /\b(\d{1,2}[:.,]?\d{0,2}\s*(?:AM|PM))\b/gi;
  const times: string[] = [];
  let timeMatch;
  
  while ((timeMatch = timeRegex.exec(cleanedContent)) !== null) {
    const normalizedTime = normalizeTime(timeMatch[1]);
    if (normalizedTime && !times.includes(normalizedTime)) {
      times.push(normalizedTime);
    }
  }
  
  // Enhanced class-trainer pattern matching with better segmentation
  const classTrainerPatterns = [
    // Pattern 1: Standard format "CLASS - TRAINER" (more restrictive)
    /([A-Za-z0-9\s\(\)\'\!\+\/\-]{8,45})\s*[-–—]\s*([A-Za-z\s]{3,25})/g,
    // Pattern 2: Alternative format with colon
    /([A-Za-z0-9\s\(\)\'\!\+\/\-]{8,45})\s*[:|]\s*([A-Za-z\s]{3,25})/g,
    // Pattern 3: Look for class names followed by trainer names (space separated)
    /\b((?:STUDIO\s+)?(?:BARRE\s*57|CARDIO\s*BARRE|MAT\s*57|STRENGTH\s*LAB|BACK\s*BODY\s*BLAZE|SWEAT\s*IN\s*30|TRAINER'S?\s*CHOICE|FOUNDATIONS|RECOVERY|PRE\/?POST\s*NATAL|HIIT|AMPED\s*UP!?|POWERCYCLE|FIT|HOSTED\s*CLASS)(?:\s*(?:PLUS|EXPRESS|\([^)]+\)))?)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/gi
  ];
  
  const classTrainers: { className: string; trainer: string }[] = [];
  
  for (const pattern of classTrainerPatterns) {
    let match;
    const tempContent = cleanedContent; // Work with a copy to avoid regex state issues
    
    while ((match = pattern.exec(tempContent)) !== null) {
      const rawClassName = match[1].trim();
      const rawTrainerName = match[2].trim();
      
      // Skip if class name is too short or too long (likely not a real class)
      if (rawClassName.length < 8 || rawClassName.length > 45) {
        continue;
      }
      
      // Skip if trainer name is too short or too long
      if (rawTrainerName.length < 3 || rawTrainerName.length > 25) {
        continue;
      }
      
      // Skip if trainer name contains numbers (likely not a real trainer)
      if (/\d/.test(rawTrainerName)) {
        continue;
      }
      
      // Additional check: skip if class name still contains promotional keywords
      const promotionalCheck = /\b(?:slay|battle|galore|crush|dominate|conquer|ultimate|supreme|epic|legendary|extravaganza|spectacular|exclusive|premium|deluxe|limited|special|unique|rare)\b/i;
      if (promotionalCheck.test(rawClassName)) {
        continue;
      }
      
      // Normalize and validate
      const className = matchClassName(rawClassName);
      const trainerName = normalizeTeacherName(rawTrainerName);
      
      // Additional validation: check if both class and trainer names are legitimate
      if (isValidClassName(className) && isValidTrainerName(trainerName)) {
        // Check for duplicates
        const isDuplicate = classTrainers.some(ct => 
          ct.className.toLowerCase() === className.toLowerCase() && 
          ct.trainer.toLowerCase() === trainerName.toLowerCase()
        );
        
        if (!isDuplicate) {
          classTrainers.push({
            className: className,
            trainer: trainerName
          });
        }
      }
    }
  }
  
  // If no standard patterns found, try alternative extraction methods
  if (classTrainers.length === 0 && times.length > 0) {
    // Try to find class names without specific trainer patterns
    const classOnlyPatterns = [
      /\b((?:STUDIO\s+)?(?:BARRE\s*57|CARDIO\s*BARRE|MAT\s*57|STRENGTH\s*LAB|BACK\s*BODY\s*BLAZE|SWEAT\s*IN\s*30|TRAINER'S?\s*CHOICE|FOUNDATIONS|RECOVERY|PRE\/?POST\s*NATAL|HIIT|AMPED\s*UP!?|POWERCYCLE|FIT|HOSTED\s*CLASS)(?:\s*(?:PLUS|EXPRESS|\([^)]+\)))?)/gi
    ];
    
    for (const pattern of classOnlyPatterns) {
      let match;
      while ((match = pattern.exec(cleanedContent)) !== null) {
        const rawClassName = match[1].trim();
        const className = matchClassName(rawClassName);
        
        if (isValidClassName(className)) {
          classTrainers.push({
            className: className,
            trainer: 'TBA' // To be announced
          });
        }
      }
    }
  }
  
  // Match times with class-trainer pairs
  const count = Math.min(times.length, classTrainers.length);
  for (let i = 0; i < count; i++) {
    classes.push({
      time: times[i],
      className: classTrainers[i].className,
      trainer: classTrainers[i].trainer
    });
  }
  
  // If we have more times than class-trainer pairs, try to match with available classes
  if (times.length > classTrainers.length && classTrainers.length > 0) {
    const remainingTimes = times.slice(classTrainers.length);
    for (let i = 0; i < remainingTimes.length && i < classTrainers.length; i++) {
      const classTrainerIndex = i % classTrainers.length;
      classes.push({
        time: remainingTimes[i],
        className: classTrainers[classTrainerIndex].className,
        trainer: classTrainers[classTrainerIndex].trainer
      });
    }
  }
  
  return classes;
}

// Helper function to validate trainer names
function isValidTrainerName(name: string): boolean {
  if (!name || name.trim().length < 2) return false;
  
  const trimmed = name.trim();
  
  // Should not contain numbers
  if (/\d/.test(trimmed)) return false;
  
  // Should not be all uppercase (likely promotional text)
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 3) return false;
  
  // Should not contain special promotional words
  const promotionalWords = ['special', 'guest', 'celebrity', 'exclusive', 'limited', 'battle', 'challenge'];
  const lowerName = trimmed.toLowerCase();
  for (const word of promotionalWords) {
    if (lowerName.includes(word)) return false;
  }
  
  // Should be reasonable length for a name (2-30 characters)
  if (trimmed.length > 30) return false;
  
  return true;
}