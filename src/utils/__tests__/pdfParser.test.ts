import { describe, it, expect } from 'vitest';
import { parseScheduleFromRawOCR } from '../pdfParser';
import { matchPdfToCsv, summarizeDiscrepancies } from '../aiMatchingUtils';
import type { ClassData } from '@/types/schedule';

// Sample merged OCR text (simplified)
const sampleOCR = `MONDAY TUESDAY\n\n7:15 AM STRENGTH (PULL) - Anisha 7:30 AM powerCycle - Richard\n7:30 AM BARRE 57 - Simonelle 730AM FT-Pramal\n`;

function makeCsvSchedule(): { [day: string]: ClassData[] } {
  return {
    Monday: [
      {
        day: 'Monday', timeRaw: '7:15 AM', timeDate: null, time: '7:15 AM',
        location: 'Kwality House, Kemps Corner', className: 'Studio Strength Lab (Pull)', trainer1: 'Anisha Shah', cover: '', notes: '', uniqueKey: 'mon_strength_715'
      },
      {
        day: 'Monday', timeRaw: '7:30 AM', timeDate: null, time: '7:30 AM',
        location: 'Kwality House, Kemps Corner', className: 'Studio Barre 57', trainer1: 'Simonelle De Vitre', cover: '', notes: '', uniqueKey: 'mon_barre_730'
      }
    ],
    Tuesday: [
      {
        day: 'Tuesday', timeRaw: '7:30 AM', timeDate: null, time: '7:30 AM',
        location: 'Kwality House, Kemps Corner', className: 'Studio PowerCycle', trainer1: "Richard D'Costa", cover: '', notes: '', uniqueKey: 'tue_power_730'
      },
      {
        day: 'Tuesday', timeRaw: '7:30 AM', timeDate: null, time: '7:30 AM',
        location: 'Kwality House, Kemps Corner', className: 'Studio FIT', trainer1: 'Pranjali Jain', cover: '', notes: '', uniqueKey: 'tue_fit_730'
      }
    ]
  };
}

describe('parseScheduleFromRawOCR merged day assignment', () => {
  it('distributes entries across days without collapsing to last day', () => {
    const parsed = parseScheduleFromRawOCR(sampleOCR, 'Kwality House');
    const monday = parsed.filter(p => p.day === 'Monday');
    const tuesday = parsed.filter(p => p.day === 'Tuesday');
    expect(monday.length).toBeGreaterThan(0);
    expect(tuesday.length).toBeGreaterThan(0);
    // Ensure not all entries went to Tuesday
    expect(monday.length + tuesday.length).toBe(parsed.length);
  });
});

describe('matchPdfToCsv basic matching', () => {
  it('matches PDF entries to CSV schedule within tolerance', () => {
    const pdfEntries = parseScheduleFromRawOCR(sampleOCR, 'Kwality House');
    const csvSchedule = makeCsvSchedule();
    const results = matchPdfToCsv(pdfEntries, csvSchedule, { timeToleranceMinutes: 5 });
    const summary = summarizeDiscrepancies(results);
    expect(summary.matched).toBeGreaterThan(0);
  });
});

describe('time normalization heuristic disabled', () => {
  it('does not remap 1:30 AM to 11:30 AM when flag disabled', () => {
    const raw = 'MONDAY\n1:30 AM MAT 57 - Anisha';
    const parsed = parseScheduleFromRawOCR(raw, 'Kwality House');
    const entry = parsed.find(p => p.time.startsWith('1:30'));
    // If heuristic off, time remains 1:30 AM
    expect(entry?.time).toBe('1:30 AM');
  });
});
