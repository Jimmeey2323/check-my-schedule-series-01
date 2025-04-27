
import { PdfClassData } from '@/types/schedule';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import Fuse from 'fuse.js';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.7.107/build/pdf.worker.min.js';

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

// Use Tesseract.js for OCR on a PDF page
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
  
  // Fix the Tesseract.js configuration issue by using proper parameters
  const { data: { text } } = await Tesseract.recognize(
    canvas, 
    "eng", 
    { 
      logger: m => {},
      // Use proper Tesseract.js configuration parameters
      tesseract: {
        dataPath: 'https://unpkg.com/tesseract.js-data@2.0.0/eng',
        engineMode: Tesseract.EngineMode.TESSERACT_ONLY,
        workerBlobURL: false,
        gzip: false,
      }
    }
  );
  
  return text;
}

// Parse schedule data from extracted PDF text
export function parseScheduleFromPdfText(fullText: string, location: string): PdfClassData[] {
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  
  // Find where the schedule starts (at the first day of week)
  const startIndex = fullText.search(/\bMonday\b/i);
  if (startIndex === -1) return [];
  
  const text = fullText.slice(startIndex);
  
  // Split text into day blocks
  const daySplitRegex = new RegExp(`\\b(${daysOfWeek.join("|")})\\b`, "gi");
  let dayBlocks = [];
  let lastIndex = 0;
  let match;
  
  while ((match = daySplitRegex.exec(text)) !== null) {
    if (match.index !== lastIndex) {
      dayBlocks.push({ day: text.substring(lastIndex, match.index).trim(), dayName: null });
    }
    dayBlocks.push({ day: null, dayName: match[0] });
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    dayBlocks.push({ day: text.substring(lastIndex).trim(), dayName: null });
  }
  
  // Organize content by day
  let daysData = [];
  let currentDay = null;
  
  for (let i = 0; i < dayBlocks.length; i++) {
    if (dayBlocks[i].dayName) {
      currentDay = normalizeDay(dayBlocks[i].dayName);
      daysData.push({ day: currentDay, content: "" });
    } else if (currentDay) {
      daysData[daysData.length - 1].content += dayBlocks[i].day + " ";
    }
  }
  
  // Extract schedule items from each day's content
  const schedule: PdfClassData[] = [];
  
  daysData.forEach(({day, content}) => {
    // Clean up content
    let cleanContent = content.replace(/\s+/g, " ").trim();
    cleanContent = cleanContent.replace(/7 YEARS STRONG/gi, "");
    cleanContent = cleanContent.replace(/BEAT THE TRAINER/gi, "");
    cleanContent = cleanContent.replace(/SLOGAN.*?(\.|$)/gi, "");
    cleanContent = cleanContent.trim();
    
    // Extract class and trainer pairs
    const classTrainerRegex = /([A-Za-z0-9\s\(\)\'\!\+\/\-]+?)\s*-\s*([A-Za-z]+)/g;
    let classTrainerMatches = [];
    let m;
    
    while ((m = classTrainerRegex.exec(cleanContent)) !== null) {
      classTrainerMatches.push({
        classRaw: m[1].trim(),
        trainerRaw: m[2].trim()
      });
    }
    
    // Extract times from content
    let contentWithoutClasses = cleanContent;
    
    classTrainerMatches.forEach(({classRaw, trainerRaw}) => {
      const escapedClass = classRaw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const escapedTrainer = trainerRaw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const pattern = new RegExp(`${escapedClass}\\s*-\\s*${escapedTrainer}`, "gi");
      contentWithoutClasses = contentWithoutClasses.replace(pattern, "");
    });
    
    contentWithoutClasses = contentWithoutClasses.trim();
    
    // Extract time values
    const timeRegex = /(\d{1,2}[:.]?\d{0,2}\s?(AM|PM))/gi;
    let timeMatches = [];
    
    while ((m = timeRegex.exec(contentWithoutClasses)) !== null) {
      timeMatches.push(normalizeTime(m[1]));
    }
    
    // Create schedule items by matching times with class-trainer pairs
    const count = Math.min(classTrainerMatches.length, timeMatches.length);
    
    for (let i = 0; i < count; i++) {
      const className = matchClassName(classTrainerMatches[i].classRaw);
      const trainerName = classTrainerMatches[i].trainerRaw.replace(/\s{2,}/g, " ").trim();
      const time = timeMatches[i];
      
      const uniqueKey = (day + time + className + trainerName + location)
        .toLowerCase()
        .replace(/\s+/g, '');
      
      schedule.push({
        day,
        time,
        className,
        trainer: trainerName,
        location,
        uniqueKey
      });
    }
  });
  
  return schedule;
}
