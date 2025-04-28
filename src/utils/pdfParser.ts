
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
    if (trainerName === "Nishant") {
      trainerName = "Nishanth"; // Convert Nishant to Nishanth
    }

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
// Main parsing function for PDF text
export function parseScheduleFromPdfText(fullText: string, location: string): PdfClassData[] {
  const schedule: PdfClassData[] = [];
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  
  // Find schedule start
  const startIndex = fullText.search(/\bMonday\b/i);
  if (startIndex === -1) return [];
  
  const text = fullText.slice(startIndex);
  
  // Split into day blocks
  const dayBlocks = text.split(new RegExp(`\\b(?=${daysOfWeek.join("|")})\\b`, "i"));
  
  dayBlocks.forEach(block => {
    const dayMatch = block.match(new RegExp(`^(${daysOfWeek.join("|")})`, "i"));
    if (!dayMatch) return;
    
    const day = normalizeDay(dayMatch[1]);
    const content = block.slice(dayMatch[0].length).trim();

    // Debug log for Saturday
    if (day === "Saturday") {
        console.log(`Saturday block content:`, content);
    }
    
    // Clean up content
    let cleanContent = content.replace(/\s+/g, " ").trim();
    cleanContent = cleanContent
      .replace(/7 YEARS STRONG/gi, "")
      .replace(/BEAT THE TRAINER/gi, "")
      .replace(/SLOGAN.*?(\.|$)/gi, "")
      .trim();
    
    console.log(`Processing day: ${day}, content length: ${cleanContent.length}`);
    
    // Extract classes for this day
    const classes = extractClassesFromContent(cleanContent);
    console.log(`Found ${classes.length} classes for ${day}`);
    
    // Add classes to schedule
    classes.forEach(({ time, className, trainer }) => {
      const uniqueKey = (day + time + className + trainer + location)
        .toLowerCase()
        .replace(/\s+/g, '');
      
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
