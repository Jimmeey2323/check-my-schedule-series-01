import { PdfClassData } from '@/types/schedule';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import Fuse from 'fuse.js';

// Set up PDF.js worker - update to match the installed version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const knownClassesList = [
  "Barre 57", "Cardio Barre", "Cardio Barre Plus", "Cardio Barre (Express)", 
  "Foundations", "Mat 57", "Mat 57 (Express)", "Fit", "Back Body Blaze", 
  "Back Body Blaze (Express)", "Sweat in 30", "Recovery", "Pre/Post Natal", 
  "HIIT", "Amped Up!", "Trainer's Choice", "PowerCycle", "PowerCycle (Express)"
];

// Helper function to normalize time string
function normalizeTime(rawTime: string): string {
  let t = rawTime.replace(/(\d{1,2})\.(\d{2})/g, '$1:$2').trim().toUpperCase();
  
  if (!t.match(/\d{1,2}:\d{2}/)) {
    t = t.replace(/(\d{1,2})(\s?[AP]M)/, '$1:00$2');
  }
  
  return t;
}

// Helper function to normalize class name
function matchClassName(text: string): string {
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

// Improved helper function to extract classes from content
function extractClassesFromContent(content: string): { time: string; className: string; trainer: string }[] {
  const classes: { time: string; className: string; trainer: string }[] = [];
  
  // First, let's extract all the individual class-trainer pairs more carefully
  // Look for patterns like: "BARRE 57 (EXPRESS) - Pranjali" or "powerCycle - Vivaran"
  const classTrainerRegex = /([A-Z][A-Za-z0-9\s\(\)]+?)\s*-\s*([A-Za-z]+)(?=\s|$)/g;
  let classTrainerMatch;
  const classTrainers: { className: string; trainer: string }[] = [];
  
  while ((classTrainerMatch = classTrainerRegex.exec(content)) !== null) {
    let className = classTrainerMatch[1].trim();
    let trainerName = classTrainerMatch[2].trim();
    
    // Clean up class name - remove common OCR artifacts
    className = className
      .replace(/\s+/g, ' ')
      .replace(/^\d+\s*/, '') // Remove leading numbers
      .trim();
    
    // Skip if class name is too short or looks like noise
    if (className.length < 3) continue;
    
    // Convert trainer name variations
    if (trainerName === "Nishant") {
      trainerName = "Nishanth";
    }

    classTrainers.push({
      className: matchClassName(className),
      trainer: trainerName
    });
  }
  
  // Extract times from the content
  const timeRegex = /(\d{1,2}[:.]?\d{0,2}\s?[AP]M)/gi;
  const times: string[] = [];
  let timeMatch;
  
  while ((timeMatch = timeRegex.exec(content)) !== null) {
    times.push(normalizeTime(timeMatch[1]));
  }
  
  console.log(`Found ${times.length} times and ${classTrainers.length} class-trainer pairs`);
  console.log('Times:', times);
  console.log('Class-Trainers:', classTrainers);
  
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

// Alternative parsing approach for better accuracy
function extractClassesAlternativeApproach(content: string): { time: string; className: string; trainer: string }[] {
  const classes: { time: string; className: string; trainer: string }[] = [];
  
  // Split content into logical segments and process each
  const segments = content.split(/(?=\d{1,2}[:.]?\d{0,2}\s?[AP]M)/i);
  
  segments.forEach(segment => {
    // Extract time from beginning of segment
    const timeMatch = segment.match(/^(\d{1,2}[:.]?\d{0,2}\s?[AP]M)/i);
    if (!timeMatch) return;
    
    const time = normalizeTime(timeMatch[1]);
    
    // Look for class-trainer pattern in the remaining text
    const remainingText = segment.slice(timeMatch[0].length).trim();
    
    // More specific regex to match class names followed by trainer
    const classTrainerMatch = remainingText.match(/^([A-Z][A-Za-z0-9\s\(\)]+?)\s*-\s*([A-Za-z]+)/);
    
    if (classTrainerMatch) {
      let className = classTrainerMatch[1].trim();
      let trainerName = classTrainerMatch[2].trim();
      
      // Clean up class name
      className = className.replace(/\s+/g, ' ').trim();
      
      // Convert trainer name variations
      if (trainerName === "Nishant") {
        trainerName = "Nishanth";
      }
      
      classes.push({
        time,
        className: matchClassName(className),
        trainer: trainerName
      });
    }
  });
  
  return classes;
}

export function parseScheduleFromPdfText(fullText: string, location: string): PdfClassData[] {
  const schedule: PdfClassData[] = [];
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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
    let content = block.slice(dayMatch[0].length).trim();

    // Debug log for each day
    console.log(`Processing day: ${day}`);
    console.log(`Raw content: ${content.substring(0, 200)}...`);

    // Clean up the content more thoroughly
    content = content
      .replace(/\s+/g, " ")
      .replace(/7 YEARS STRONG/gi, "")
      .replace(/BEAT THE TRAINER/gi, "")
      .replace(/SLOGAN.*?(\.|$)/gi, "")
      .replace(/INTERMEDIATE:\s*CARDIO\s*BARREARRE,?\s*MAT\s*57\s*•?\s*/gi, "")
      .replace(/FOUNDATION\s*:\s*BARRE\s*57\s*•?\s*/gi, "")
      .replace(/STUDIO\s*SCHEDULE.*?$/gi, "")
      .replace(/BEGINNER\s*:.*?$/gi, "")
      .trim();

    console.log(`Cleaned content: ${content.substring(0, 200)}...`);

    // Try both approaches and use the one that gives better results
    const classes1 = extractClassesFromContent(content);
    const classes2 = extractClassesAlternativeApproach(content);
    
    // Use the approach that found more valid classes
    const classes = classes2.length > classes1.length ? classes2 : classes1;
    
    console.log(`Found ${classes.length} classes for ${day}`);

    // Add classes to the schedule
    classes.forEach(({ time, className, trainer }) => {
      const uniqueKey = (day + time + className + trainer + location)
        .toLowerCase()
        .replace(/\s+/g, "");

      schedule.push({
        day,
        time,
        className,
        trainer,
        location,
        uniqueKey
      });
    });
  });

  return schedule;
}
