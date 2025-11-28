# OCR Text Parsing Enhancement - Summary

## Problem
The raw OCR text extracted from PDF schedules contained **combined data from 2 days on the same row**. For example:
```
7:15 AM STRENGTH (PULL) - Anisha 7:30 AM powerCycle - Richard
```
This single line contains:
- **Monday**: 7:15 AM STRENGTH (PULL) - Anisha
- **Tuesday**: 7:30 AM powerCycle - Richard

The existing parser couldn't properly split and assign these entries to the correct days.

## Solution Implemented

### 1. New Function: `cleanAndSplitMergedRow()`
Located in `/src/utils/pdfParser.ts`

**Purpose**: Clean and split rows containing multiple day entries

**Key Features**:
- Removes garbage OCR patterns (KEMPS CORNER, date headers, category labels, etc.)
- Detects multiple time patterns in a single line
- Splits the line at each time occurrence
- Extracts time, class name, and trainer for each segment
- Cleans up OCR errors in class names (e.g., "AU 57 Exr e ees M")
- Normalizes times, class names, and teacher names

**Pattern Matching**:
- Finds all times: `(\d{1,2}[:.]?\d{0,2}\s*(?:AM|PM))`
- Extracts class-trainer pairs: `(.+?)\s*[-–—]\s*([A-Za-z]+)`
- Handles compact time formats: `730AM`, `1030AM`, etc.

### 2. New Export Function: `parseScheduleFromRawOCR()`
Located in `/src/utils/pdfParser.ts`

**Purpose**: Parse schedule from raw OCR text with merged day columns

**Process**:
1. Clean and filter header/garbage lines
2. Find day header lines (e.g., "MONDAY TUESDAY")
3. Process each section between headers
4. For each line:
   - Use `cleanAndSplitMergedRow()` to extract entries
   - Assign entries to days based on their position
   - If 2 days in header and 2 entries found → first to first day, second to second day
5. Generate `PdfClassData` objects with normalized values

### 3. Enhanced `parseScheduleFromPdfText()`
**Addition**: Automatic detection of merged column format

```typescript
// Detect if this is a merged column format
const lines = fullText.split(/\n/);
let multipleDaysOnSameLine = false;
for (const line of lines) {
  const daysInLine = daysOfWeek.filter(day => 
    new RegExp(`\\b${day}\\b`, 'i').test(line));
  if (daysInLine.length >= 2) {
    multipleDaysOnSameLine = true;
    break;
  }
}

// If detected, use raw OCR parser
if (multipleDaysOnSameLine) {
  return parseScheduleFromRawOCR(fullText, location);
}
```

## Garbage Patterns Removed

The cleaning function removes these common OCR artifacts:
- `KEMPS CORNER`
- `November 24th - November 30th 2025`
- `BEGINNER :`, `INTERMEDIATE :`, `ADVANCED :`
- `BARRE 57, powerCycle` (category listings)
- `STUDIO SCHEDULE`
- `TaBaTA`, `ICY ISOMETRIC` (trailing garbage)
- `HEDLLY EREIDEAEES ol` (OCR noise)
- `SELT Y RISy` (OCR noise)
- Patterns like `AU 57 Exr e ees M` (malformed text)

## Time Normalization

Handles various time formats:
- `7:15 AM` → `7:15 AM`
- `730AM` → `7:30 AM`
- `1030AM` → `10:30 AM`
- `7.30 AM` → `7:30 AM`
- `5:00PM` → `5:00 PM`

## Class Name Normalization

Uses existing mappings and fuzzy matching:
- `MATS7` → `Studio Mat 57`
- `BARRES7` → `Studio Barre 57`
- `FT` → `Studio FIT`
- `powerCycle` → `Studio PowerCycle`
- `STRENGTH LAB (PULL)` → `Studio Strength Lab (Pull)`

## Teacher Name Normalization

Uses existing mappings:
- `Pramal` → `Pranjali Jain`
- `Awlan` → `Atulan Purohit`
- `Mrgakshi` → `Mrigakshi Jaiswal`
- `Karan` → `Karan Bhatia`

## Example Input/Output

### Input (Raw OCR):
```
MONDAY TUESDAY

7:15 AM STRENGTH (PULL) - Anisha 7:30 AM powerCycle - Richard
7:30 AM  BARRE 57 - Simonelle  730AM  FT-Pramal
8:00 AM powerCycle - Richard 8:30 AM AMPED UP - Atulan
```

### Output (Parsed):
**Monday**:
- 7:15 AM - Studio Strength Lab (Pull) - Anisha Shah
- 7:30 AM - Studio Barre 57 - Simonelle De Vitre
- 8:00 AM - Studio PowerCycle - Richard D'Costa

**Tuesday**:
- 7:30 AM - Studio PowerCycle - Richard D'Costa
- 7:30 AM - Studio FIT - Pranjali Jain
- 8:30 AM - Studio Amped Up! - Atulan Purohit

## Integration Points

The new parsing logic integrates seamlessly with existing code:

1. **Automatic Detection**: The main parser detects merged format and routes to the new parser
2. **Reuses Normalization**: Uses existing `normalizeTime()`, `matchClassName()`, `normalizeTeacherName()` functions
3. **Same Output Format**: Returns `PdfClassData[]` compatible with existing code
4. **Backwards Compatible**: Falls back to original parsers if merged format not detected

## Testing

Test files created:
- `test-ocr-parser.js` - Node.js test for detection logic
- `test-ocr-parsing.html` - Browser-based visual test

To test:
```bash
node test-ocr-parser.js
```

Or open `test-ocr-parsing.html` in a browser.

## Files Modified

1. `/src/utils/pdfParser.ts`
   - Added `cleanAndSplitMergedRow()` function
   - Added `parseScheduleFromRawOCR()` export function
   - Enhanced `parseScheduleFromPdfText()` with auto-detection
   - Fixed TypeScript iterator issues (Array.from() conversions)
   - Fixed page.render() parameter for pdfjs

## Key Benefits

✅ **Accurate Splitting**: Correctly splits combined day entries
✅ **Robust Cleaning**: Removes all known garbage patterns
✅ **Smart Detection**: Automatically detects merged column format
✅ **Comprehensive Normalization**: Times, classes, and teachers all normalized
✅ **Error Handling**: Validates times and skips invalid entries
✅ **Backwards Compatible**: Doesn't break existing parsing logic

## Usage

The parser now automatically handles merged column OCR text:

```typescript
import { parseScheduleFromPdfText } from '@/utils/pdfParser';

// Automatically detects and handles merged columns
const schedule = parseScheduleFromPdfText(rawOCRText, 'Kwality House, Kemps Corner');
```

Or use directly:

```typescript
import { parseScheduleFromRawOCR } from '@/utils/pdfParser';

const schedule = parseScheduleFromRawOCR(rawOCRText, 'Kwality House, Kemps Corner');
```
