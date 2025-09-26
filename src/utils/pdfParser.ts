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
  'Hosted Class': 'Studio Hosted Class',
  
  // Special theme classes
  'SLAY GLUTES GALORE': 'Studio Barre 57',
  'BATTLE OF THE BANDS': 'Studio Barre 57',
  'BATTLE OF THE BANDS BARRE 57': 'Studio Barre 57',
  'SLAY GLUTES GALORE BARRE 57': 'Studio Barre 57',
  'SLAY GLUTES': 'Studio Barre 57',
  'GLUTES GALORE': 'Studio Barre 57'
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
  time = time.replace(/\./g, ':');
  
  // Remove extra spaces around colons (this should already be done, but just in case)
  time = time.replace(/\s*:\s*/g, ':');
  
  // Ensure AM/PM is always preceded by a space
  time = time.replace(/(\d)(AM|PM)/gi, '$1 $2');
  
  // Handle cases where there might be multiple spaces before AM/PM
  time = time.replace(/\s+(AM|PM)/gi, ' $1');
  
  // Legacy fallback: if still no proper format, try the old logic
  if (!time.match(/\d{1,2}:\d{2}/)) {
    time = time.replace(/(\d{1,2})(\s?[AP]M)/, '$1:00$2');
  }
  
  return time.trim().toUpperCase();
}

// Helper function to normalize class name
function matchClassName(text: string): string {
  if (!text) return '';
  
  // First check for exact mappings
  const trimmed = text.trim();
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
  
  const cleaned = text.replace(/[\s\-_.]+/g, " ").trim();
  const result = fuse.search(cleaned);
  
  if (result.length > 0) {
    return result[0].item;
  }
  
  return text.trim();
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

// Helper function to extract classes from content
function extractClassesFromContent(content: string): { time: string; className: string; trainer: string; theme?: string }[] {
  const classes: { time: string; className: string; trainer: string; theme?: string }[] = [];
  
  // Match time values
  const timeRegex = /(\d{1,2}[:.]?\d{0,2}\s?(AM|PM))/gi;
  const times: string[] = [];
  let timeMatch;
  
  while ((timeMatch = timeRegex.exec(content)) !== null) {
    times.push(normalizeTime(timeMatch[1]));
  }
  
  // Match class-trainer pairs using refined regex
  // Updated regex to better handle special class names
  const classTrainerRegex = /([A-Za-z0-9\s\(\)\'\!\+\/\-\&]+?)\s*-\s*([A-Za-z]+)/g;
  let classTrainerMatch;
  const classTrainers: { className: string; trainer: string; theme?: string }[] = [];
  
  while ((classTrainerMatch = classTrainerRegex.exec(content)) !== null) {
    let trainerName = classTrainerMatch[2].trim();
    // Normalize teacher name
    trainerName = normalizeTeacherName(trainerName);
    
    // Get the raw class name before normalization for debugging
    const rawClassName = classTrainerMatch[1].trim();
    console.log(`Raw class name before normalization: "${rawClassName}"`);
    
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
      console.log(`Special theme class detected: ${rawClassName}`);
      
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
        // Try to extract generic VS or & themes
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
        // Default to the normalized version
        className = matchClassName(rawClassName);
      }
      console.log(`Mapped special class "${rawClassName}" to "${className}" with theme "${theme}"`);
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
      console.log(`Block ${blockIndex}: No day match found`);
      return;
    }

    const day = normalizeDay(dayMatch[1]);
    let content = block.slice(dayMatch[0].length).trim();
    
    // Check specifically for Saturday content in Friday block
    if (day.toLowerCase() === 'friday') {
      // More aggressive search for Saturday content
      const saturdayMatch = content.match(new RegExp(`\\b(Saturday|SATURDAY)\\b`, "i"));
      if (saturdayMatch) {
        console.log(`Found Saturday content within Friday block at position ${saturdayMatch.index}`);
        // Split the content at Saturday
        const saturdayContent = content.slice(saturdayMatch.index);
        content = content.slice(0, saturdayMatch.index).trim();
        
        // Store Saturday content for later processing
        const satDayMatch = saturdayContent.match(new RegExp(`^(Saturday|SATURDAY)\\b`, "i"));
        if (satDayMatch) {
          const satContent = saturdayContent.slice(satDayMatch[0].length).trim();
          processedContentByDay['saturday'] = {
            content: satContent,
            classes: []
          };
          console.log(`Extracted Saturday content, length: ${satContent.length}`);
          console.log(`Saturday content preview: "${satContent.substring(0, 100)}..."`);
        }
      }
      
      // Additional check for Saturday classes that might not have the Saturday header
      // Look for time patterns that might indicate a new day
      const timePatternMatch = content.match(/\n\s*\d{1,2}[:.]?\d{0,2}\s?(AM|PM)/i);
      if (timePatternMatch && timePatternMatch.index && timePatternMatch.index > content.length / 2) {
        console.log(`Possible day break detected at position ${timePatternMatch.index} based on time pattern`);
        const possibleSatContent = content.slice(timePatternMatch.index).trim();
        content = content.slice(0, timePatternMatch.index).trim();
        
        // Only process if we don't already have Saturday content and this looks substantial
        if (!processedContentByDay['saturday'] && possibleSatContent.length > 50) {
          console.log(`Treating content after time break as possible Saturday content`);
          processedContentByDay['saturday'] = {
            content: possibleSatContent,
            classes: []
          };
        }
      }
    }

    // Debug log for each day
    console.log(`Processing day: ${day}, content length: ${content.length}`);

    // Clean up the content but preserve theme information
    let cleanContent = content.replace(/\s+/g, " ").trim();
    // Don't remove theme names as they contain important information
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
        console.log(`Filtering out invalid class: ${className}`);
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

  return schedule;
}