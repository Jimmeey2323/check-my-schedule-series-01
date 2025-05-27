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

// New approach: Parse column-based layout where classes and times are in separate sections
function parseColumnBasedLayout(content: string): { time: string; className: string; trainer: string }[] {
  const classes: { time: string; className: string; trainer: string }[] = [];
  
  // Split content into lines and clean up
  const lines = content.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  // Separate class-trainer pairs and times
  const classTrainerPairs: { className: string; trainer: string }[] = [];
  const times: string[] = [];
  
  for (const line of lines) {
    // Check if it's a time
    if (line.match(/^\d{1,2}[:\.]?\d{0,2}\s?(AM|PM)$/i)) {
      times.push(normalizeTime(line));
    }
    // Check if it's a class-trainer pair (but not powerCycle by itself without dash)
    else if (line.match(/^[A-Z].*\s-\s[A-Za-z]+$/)) {
      const match = line.match(/^(.+?)\s-\s([A-Za-z]+)$/);
      if (match) {
        let className = match[1].trim();
        let trainerName = match[2].trim();
        
        // Handle trainer name variations
        if (trainerName === "Nishant") {
          trainerName = "Nishanth";
        }
        
        classTrainerPairs.push({
          className: matchClassName(className),
          trainer: trainerName
        });
      }
    }
  }
  
  console.log(`Found ${times.length} times and ${classTrainerPairs.length} class-trainer pairs`);
  console.log('Times:', times);
  console.log('Class-Trainer pairs:', classTrainerPairs);
  
  // Pair them up by position
  const count = Math.min(times.length, classTrainerPairs.length);
  for (let i = 0; i < count; i++) {
    classes.push({
      time: times[i],
      className: classTrainerPairs[i].className,
      trainer: classTrainerPairs[i].trainer
    });
  }
  
  return classes;
}

// Fallback: Extract from mixed content (for cases where layout is different)
function extractClassesFromMixedContent(content: string): { time: string; className: string; trainer: string }[] {
  const classes: { time: string; className: string; trainer: string }[] = [];
  
  // Look for time-class-trainer patterns in sequence
  const segments = content.split(/(?=\d{1,2}[:\.]?\d{0,2}\s?[AP]M)/i);
  
  segments.forEach(segment => {
    const timeMatch = segment.match(/^(\d{1,2}[:\.]?\d{0,2}\s?[AP]M)/i);
    if (!timeMatch) return;
    
    const time = normalizeTime(timeMatch[1]);
    const remainingText = segment.slice(timeMatch[0].length).trim();
    
    // Look for the first class-trainer pattern after the time
    const classTrainerMatch = remainingText.match(/([A-Z][A-Za-z0-9\s\(\)]+?)\s*-\s*([A-Za-z]+)/);
    
    if (classTrainerMatch) {
      let className = classTrainerMatch[1].trim();
      let trainerName = classTrainerMatch[2].trim();
      
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

  // Find the first day in the text
  const firstDayMatch = fullText.match(new RegExp(`\\b(${daysOfWeek.join("|")})\\b`, "i"));
  if (!firstDayMatch) {
    console.warn("No valid day found in the PDF data.");
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

    console.log(`\n=== Processing ${day} ===`);
    console.log(`Raw content length: ${content.length}`);

    // Clean up the content - remove noise but preserve structure
    content = content
      .replace(/INTERMEDIATE:\s*CARDIO\s*BARREARRE,?\s*MAT\s*57\s*[•\s]*/gi, "")
      .replace(/FOUNDATION\s*:\s*BARRE\s*57\s*[•\s]*/gi, "")
      .replace(/STUDIO\s*SCHEDULE.*$/gi, "")
      .replace(/BEGINNER\s*:.*$/gi, "")
      .replace(/BOILER\s*ROOM.*$/gi, "")
      .replace(/COLDPLAY\s*CADENCE.*$/gi, "")
      .replace(/FIRECRACKER\s*ABS.*$/gi, "")
      .replace(/STRENGTH\s*MEETS\s*CARDIO.*$/gi, "")
      .replace(/BLOCKBUSTER\s*BEATS.*$/gi, "")
      .replace(/May\s*\d+.*?\d+.*$/gi, "")
      .replace(/BANDRA.*$/gi, "")
      .trim();

    console.log(`Cleaned content preview: ${content.substring(0, 200)}...`);

    // Try column-based parsing first (for the structured layout)
    let classes = parseColumnBasedLayout(content);
    
    // If that doesn't work well, try mixed content parsing
    if (classes.length === 0) {
      console.log("Column-based parsing failed, trying mixed content parsing...");
      classes = extractClassesFromMixedContent(content);
    }
    
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
      
      console.log(`Added: ${day} ${time} - ${className} with ${trainer}`);
    });
  });

  return schedule;
}
