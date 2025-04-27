
export interface ClassData {
  day: string;
  timeRaw: string;
  timeDate: Date | null;
  time: string;
  location: string;
  className: string;
  trainer1: string;
  cover: string;
  notes: string;
  uniqueKey: string;
}

export interface PdfClassData {
  day: string;
  time: string;
  className: string;
  trainer: string;
  location: string;
  uniqueKey: string;
}

export interface FilterState {
  day: string[];
  location: string[];
  trainer: string[];
  className: string[];
}

export interface ComparisonResult {
  csvItem: ClassData | null;
  pdfItem: PdfClassData | null;
  isMatch: boolean;
  unmatchReason: string;
  discrepancyCols: string[];
}
