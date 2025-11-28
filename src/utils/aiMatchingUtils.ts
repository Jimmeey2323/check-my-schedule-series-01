import { ClassData, PdfClassData, ComparisonResult } from '@/types/schedule';

export interface MatchOptions {
	timeToleranceMinutes?: number; // allowable time difference
	requireSameLocation?: boolean; // whether location must match
	trainerFuzzy?: boolean;        // allow partial trainer match
}

function timeToMinutes(t: string): number | null {
	const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
	if (!m) return null;
	let h = parseInt(m[1], 10);
	const minutes = parseInt(m[2], 10);
	const period = m[3].toUpperCase();
	if (period === 'PM' && h !== 12) h += 12;
	if (period === 'AM' && h === 12) h = 0;
	return h * 60 + minutes;
}

function minutesDiff(a: string, b: string): number | null {
	const ma = timeToMinutes(a);
	const mb = timeToMinutes(b);
	if (ma == null || mb == null) return null;
	return Math.abs(ma - mb);
}

function normalizeTrainerName(name: string): string {
	return (name || '').trim().toLowerCase();
}

function trainerMatches(csvTrainer: string, pdfTrainer: string, fuzzy: boolean): boolean {
	if (!csvTrainer || !pdfTrainer) return false;
	const a = normalizeTrainerName(csvTrainer);
	const b = normalizeTrainerName(pdfTrainer);
	if (a === b) return true;
	if (!fuzzy) return false;
	// simple fuzzy check: one includes the other or first 4 chars match
	if (a.includes(b) || b.includes(a)) return true;
	return a.slice(0,4) === b.slice(0,4);
}

function classMatches(csvClass: string, pdfClass: string): boolean {
	if (!csvClass || !pdfClass) return false;
	const a = csvClass.toLowerCase();
	const b = pdfClass.toLowerCase();
	if (a === b) return true;
	// ignore words like "studio" and compare core tokens
	const coreA = a.replace(/studio\s+/g,'').trim();
	const coreB = b.replace(/studio\s+/g,'').trim();
	return coreA === coreB;
}

export function matchPdfToCsv(
	pdfClasses: PdfClassData[],
	csvSchedule: { [day: string]: ClassData[] },
	options: MatchOptions = {}
): ComparisonResult[] {
	const {
		timeToleranceMinutes = 5,
		requireSameLocation = false,
		trainerFuzzy = true
	} = options;

	const results: ComparisonResult[] = [];

	// Index CSV entries by day for faster lookup
	const csvByDay = new Map<string, ClassData[]>();
	Object.entries(csvSchedule).forEach(([day, entries]) => {
		csvByDay.set(day.toLowerCase(), entries || []);
	});

	// Track which CSV entries have been matched to avoid duplicates
	const matchedCsvKeys = new Set<string>();

	pdfClasses.forEach(pdfItem => {
		const dayEntries = csvByDay.get(pdfItem.day.toLowerCase()) || [];
		let bestMatch: { item: ClassData; score: number; reason: string } | null = null;

		dayEntries.forEach(csvItem => {
			const timeDifference = minutesDiff(csvItem.time, pdfItem.time);
			if (timeDifference != null && timeDifference > timeToleranceMinutes) return;
			if (requireSameLocation && csvItem.location && pdfItem.location && csvItem.location !== pdfItem.location) return;
			if (!classMatches(csvItem.className, pdfItem.className)) return;
			if (!trainerMatches(csvItem.trainer1, pdfItem.trainer, trainerFuzzy)) return;

			// Basic scoring: lower time diff + exact trainer/class better
			let score = 0;
			score += timeDifference == null ? 2 : timeDifference / timeToleranceMinutes; // lower better
			if (normalizeTrainerName(csvItem.trainer1) === normalizeTrainerName(pdfItem.trainer)) score -= 0.5;
			if (csvItem.className === pdfItem.className) score -= 0.5;
			if (csvItem.location === pdfItem.location) score -= 0.2;

			const reasonParts: string[] = [];
			if (timeDifference != null) reasonParts.push(`Δt=${timeDifference}m`);
			if (csvItem.location === pdfItem.location) reasonParts.push('loc=✓');
			if (normalizeTrainerName(csvItem.trainer1) === normalizeTrainerName(pdfItem.trainer)) reasonParts.push('trainer=✓');
			if (csvItem.className === pdfItem.className) reasonParts.push('class=✓');

			if (!bestMatch || score < bestMatch.score) {
				bestMatch = { item: csvItem, score, reason: reasonParts.join(',') };
			}
		});

		if (bestMatch) {
			const key = bestMatch.item.uniqueKey;
			matchedCsvKeys.add(key);
			results.push({
				csvItem: bestMatch.item,
				pdfItem,
				isMatch: true,
				unmatchReason: '',
				discrepancyCols: []
			});
		} else {
			results.push({
				csvItem: null,
				pdfItem,
				isMatch: false,
				unmatchReason: 'No matching CSV entry found',
				discrepancyCols: ['day','time','className','trainer','location']
			});
		}
	});

	// Add CSV entries that were not matched
	csvByDay.forEach(entries => {
		entries.forEach(csvItem => {
			if (!matchedCsvKeys.has(csvItem.uniqueKey)) {
				results.push({
					csvItem,
					pdfItem: null,
					isMatch: false,
					unmatchReason: 'No matching PDF entry found',
					discrepancyCols: ['day','time','className','trainer','location']
				});
			}
		});
	});

	return results;
}

export function summarizeDiscrepancies(results: ComparisonResult[]) {
	const unmatchedPdf = results.filter(r => r.pdfItem && !r.isMatch).length;
	const unmatchedCsv = results.filter(r => r.csvItem && !r.isMatch).length;
	const matched = results.filter(r => r.isMatch).length;
	return { matched, unmatchedPdf, unmatchedCsv, total: results.length };
}
