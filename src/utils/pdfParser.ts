import { PdfClassData } from '@/types/schedule';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import Fuse from 'fuse.js';

// Set up PDF.js worker - update to match the installed version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

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

// Helper function to extract classes from content
function extractClassesFromContent(content: string): { time: string; className: string; trainer: string }[] {
  const classes: { time: string; className: string; trainer: string }[] = [];
  
  // Match time values
  const timeRegex = /(\d{1,2}[:.]?\d{0,2}\s?(AM|PM))/gi;
  const times: string[] = [];
  let timeMatch;
  
  while ((timeMatch = timeRegex.exec(content)) !== null) {
    times.push(normalizeTime(timeMatch[1]));
  }
  
  // Match class-trainer pairs using refined regex
  const classTrainerRegex = /([A-Za-z0-9\s\(\)\'\!\+\/\-]+?)\s*-\s*([A-Za-z]+)/g;
  let classTrainerMatch;
  const classTrainers: { className: string; trainer: string }[] = [];
  
  while ((classTrainerMatch = classTrainerRegex.exec(content)) !== null) {
    let trainerName = classTrainerMatch[2].trim();
    // Normalize teacher name
    trainerName = normalizeTeacherName(trainerName);

    classTrainers.push({
      className: matchClassName(classTrainerMatch[1].trim()),
      trainer: trainerName
    });
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
  const dayBlocks = text.split(new RegExp(`\\b(?=${daysOfWeek.join("|")})\\b`, "i"));

  dayBlocks.forEach(block => {
    const dayMatch = block.match(new RegExp(`^(${daysOfWeek.join("|")})`, "i"));
    if (!dayMatch) return;

    const day = normalizeDay(dayMatch[1]);
    const content = block.slice(dayMatch[0].length).trim();

    // Debug log for each day
    console.log(`Processing day: ${day}, content length: ${content.length}`);

    // Clean up the content
    let cleanContent = content.replace(/\s+/g, " ").trim();
    cleanContent = cleanContent
      .replace(/7 YEARS STRONG/gi, "")
      .replace(/BEAT THE TRAINER/gi, "")
      .replace(/SLOGAN.*?(\.|$)/gi, "")
      .trim();

    // Extract classes for the day
    const classes = extractClassesFromContent(cleanContent);
    console.log(`Found ${classes.length} classes for ${day}`);

    // Add classes to the schedule
    classes.forEach(({ time, className, trainer }) => {
      // Filter out invalid class names
      if (!isValidClassName(className)) {
        console.log(`Filtering out invalid class: ${className}`);
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
  });

  return schedule;
}