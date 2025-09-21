import Papa from 'papaparse';
import { ClassData } from '@/types/schedule';

// Days order for sorting and tabs
const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Allowed trainer names for normalization
const allowedNames = [
  'Rohan', 'Anisha', 'Richard', 'Pranjali', 'Reshma', 'Atulan', 'Karanvir',
  'Cauveri', 'Mrigakshi', 'Vivaran', 'Karan', 'Nishanth', 'Pushyank',
  'Kajol', 'Siddhartha', 'Shruti K','Veena','Chaitanya', 'Raunak'
];

// Class name mappings for normalization
const classNameMappings: {[key: string]: string} = {
  'Barre 57': 'Barre 57',
  'Barre57': 'Barre 57',
  'CYCLE': 'PowerCycle',
  'Cardio Barre': 'Cardio Barre',
  'FIT': 'Fit',
  'MAT57': 'Mat 57',
  "Trainer's Choice": "Trainer's Choice",
  'Cardio Barre exp': 'Cardio Barre (Express)',
  'Cardio B exp': 'Cardio Barre (Express)',
  'Cardio B': 'Cardio Barre',
  'CYCLE EXP': 'PowerCycle (Express)',
  'Mat 57 exp': 'Mat 57 (Express)',
  'Recovery': 'Recovery',
  'BBB exp': 'Back Body Blaze (Express)',
  'Foundations': 'Foundations',
  'BBB': 'Back Body Blaze',
  'Cardio Barre+': 'Cardio Barre Plus',
  'PreNatal': 'Pre/Post Natal',
  'Cardio B+': 'Cardio Barre Plus',
  'HIIT': 'HIIT',
  'Sakshi': '2',
  'Taarika': '1',
  'Sweat': 'Sweat in 30',
  'Barre 57 exp': 'Barre 57 (Express)',
  'Barre57 exp': 'Barre 57 (Express)',
  'Amped Up': 'Amped Up!',
  'STRENGTH LAB (FULL BODY)': 'Strength - FB',
  'STRENGTH (PULL)': 'Strength - Pull',
  'STRENGTH (PUSH)': 'Strength - Push'
};

// Helper function to normalize class name
export function normalizeClassName(raw: string): string {
  if (!raw) return '';
  let val = raw.trim();
  val = val.replace(/\s+/g, ' ').toLowerCase();
  
  for (const [key, value] of Object.entries(classNameMappings)) {
    if (val === key.toLowerCase()) {
      return value;
    }
  }
  
  return raw;
}

// Helper function to check if a class name is valid (not a trainer name or invalid entry)
export function isValidClassName(className: string): boolean {
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

// Helper function to normalize location name
export function normalizeLocationName(raw: string): string {
  if (!raw) return '';
  
  // Trim and normalize the input string
  const val = raw.trim().toLowerCase();

  // Specific replacements for location names
  if (val === 'annex') return 'Kemps';
  
  // Return the original value if no matches are found
  return raw.trim();
}

// Helper function to normalize trainer name
export function normalizeTrainerName(raw: string): string {
  if (!raw) return '';
  
  // Trim and normalize the input string
  const val = raw.trim().toLowerCase();

  // Specific replacements for trainer names
  if (val === 'mriga') return 'Mrigakshi';
  if (val === 'nishant') return 'Nishanth';
  if (val === 'raunaq') return 'Raunak';

  // Check for exact matches in the allowed names
  for (const name of allowedNames) {
    if (val === name.toLowerCase()) return name;
  }

  // Check for partial matches in the allowed names
  for (const name of allowedNames) {
    if (val.includes(name.toLowerCase())) return name;
  }

  // Return the original value if no matches are found
  return raw.trim();
}

// Helper function to normalize time string format
export function normalizeTimeString(timeStr: string): string {
  if (!timeStr) return '';
  
  let time = timeStr.trim();
  
  // First normalize spaces around colons, commas, and dots BEFORE pattern matching
  // This ensures "10 :00 AM" becomes "10:00 AM" before we try to match patterns
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
  
  return time.trim().toUpperCase();
}

// Helper function to parse time string to Date
export function parseTimeToDate(timeStr: string): Date | null {
  if (!timeStr) return null;

  const today = new Date();
  
  // First normalize the time string
  let time = normalizeTimeString(timeStr);

  // Try to match time in format "HH:MM AM/PM"
  const ampmMatch = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const minute = parseInt(ampmMatch[2], 10);
    const ampm = ampmMatch[3].toUpperCase();

    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    return new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, minute);
  }

  // Try to match time in format "HH:MM"
  const hmMatch = time.match(/^(\d{1,2}):(\d{2})$/);
  if (hmMatch) {
    const hour = parseInt(hmMatch[1], 10);
    const minute = parseInt(hmMatch[2], 10);
    return new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, minute);
  }

  // Try to match time in format "HH"
  const hMatch = time.match(/^(\d{1,2})$/);
  if (hMatch) {
    const hour = parseInt(hMatch[1], 10);
    return new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, 0);
  }

  return null;
}
// Helper function to format Date to time string
export function formatTime(date: Date | null): string {
  if (!date) return '';
  
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minStr = minutes < 10 ? '0' + minutes : minutes;
  
  return `${hours}:${minStr} ${ampm}`;
}

// Main function to extract schedule data from CSV text
export async function extractScheduleData(csvText: string): Promise<{[day: string]: ClassData[]}> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data as string[][];
          
          if (rows.length < 5) {
            throw new Error('CSV does not have enough rows (minimum 5 required)');
          }
          
          const dayRow = rows[2];
          const headerRow = rows[3];
          const dataRows = rows.slice(4);
          
          // Define column indices for each piece of data
          const locationCols = [1, 7, 13, 18, 23, 28, 34];
          const dayCols = locationCols;
          const classCols = [2, 8, 14, 19, 24, 29, 35];
          const trainer1Cols = [3, 9, 15, 20, 25, 30, 36];
          const coverCols = [6, 12, 17, 22, 27, 32, 38];
          
          // Improved time column detection - check with case insensitivity
          let timeColIndex = -1;
          for (let i = 0; i < headerRow.length; i++) {
            const header = headerRow[i]?.trim()?.toLowerCase() || '';
            if (header === 'time') {
              timeColIndex = i;
              break;
            }
          }
          
          console.log("Header row:", headerRow);
          console.log("Time column index found:", timeColIndex);
          
          if (timeColIndex === -1) {
            throw new Error('Time column header not found in row 4. Available headers: ' + headerRow.filter(Boolean).join(', '));
          }
          
          // Extract classes from rows
          const classes: ClassData[] = [];
          
          for (const row of dataRows) {
            for (let setIdx = 0; setIdx < locationCols.length; setIdx++) {
              const locCol = locationCols[setIdx];
              const dayCol = dayCols[setIdx];
              const classCol = classCols[setIdx];
              const trainer1Col = trainer1Cols[setIdx];
              const coverCol = coverCols[setIdx];
              
              const location = normalizeLocationName(row[locCol]?.trim() || '');
              if (!location) continue;
              
              const dayRaw = dayRow[dayCol]?.trim() || 'Unknown';
              const day = daysOrder.find(d => d.toLowerCase() === dayRaw.toLowerCase()) || dayRaw;
              
              let classNameRaw = row[classCol]?.trim() || '';
              let className = normalizeClassName(classNameRaw);
              if (!className || !isValidClassName(className)) continue;
              
              let trainer1Raw = row[trainer1Col]?.trim() || '';
              let coverRaw = row[coverCol]?.trim() || '';
              let trainer1 = normalizeTrainerName(trainer1Raw);
              let notes = '';
              
              if (coverRaw) {
                const coverNorm = normalizeTrainerName(coverRaw);
                notes = `Cover (${coverNorm}) replaces Trainer 1 (${trainer1})`;
                trainer1 = coverNorm;
              }
              
              const timeRaw = row[timeColIndex]?.trim() || '';
              const timeDate = parseTimeToDate(timeRaw);
              const time = timeDate ? formatTime(timeDate) : timeRaw;
              
              const uniqueKey = (
                day + time + className + trainer1 + location
              ).toLowerCase().replace(/\s+/g, '');
              
              classes.push({
                day,
                timeRaw,
                timeDate,
                time,
                location,
                className,
                trainer1,
                cover: coverRaw,
                notes,
                uniqueKey,
              });
            }
          }
          
          // Group classes by day
          const classesByDay: {[day: string]: ClassData[]} = {};
          
          for (const cls of classes) {
            if (!classesByDay[cls.day]) classesByDay[cls.day] = [];
            classesByDay[cls.day].push(cls);
          }
          
          // Sort classes by time within each day
          const sortedClassesByDay: {[day: string]: ClassData[]} = {};
          
          daysOrder.forEach(day => {
            if (classesByDay[day]) {
              classesByDay[day].sort((a, b) => {
                if (a.timeDate && b.timeDate) return a.timeDate.getTime() - b.timeDate.getTime();
                if (a.timeDate) return -1;
                if (b.timeDate) return 1;
                return 0;
              });
              
              sortedClassesByDay[day] = classesByDay[day];
            }
          });
          
          // Add any days not in standard order
          Object.keys(classesByDay)
            .filter(d => !daysOrder.includes(d))
            .sort()
            .forEach(day => {
              classesByDay[day].sort((a, b) => {
                if (a.timeDate && b.timeDate) return a.timeDate.getTime() - b.timeDate.getTime();
                if (a.timeDate) return -1;
                if (b.timeDate) return 1;
                return 0;
              });
              
              sortedClassesByDay[day] = classesByDay[day];
            });
          
          resolve(sortedClassesByDay);
        } catch (err) {
          reject(err);
        }
      },
      error: (err) => {
        reject(new Error('Error parsing CSV file: ' + err.message));
      },
    });
  });
}
