// Test script for OCR parsing
const testOCRText = `KEMPS
CORNER

November 24th - November 30th 2025
BEGINNER : BARRE 57, powerCycle

INTERMEDIATE : CARDIO BARRE , MAT 57, CARDIO BARRE PLUS, FIT, BACK BODY BLAZE
STRENGTH LAB, powerCycle

ADVANCED : HIIT, AMPED UP!

MONDAY TUESDAY

7:15 AM STRENGTH (PULL) - Anisha 7:30 AM powerCycle - Richard

7:30 AM  BARRE 57 - Simonelle  730AM  FT-Pramal
8:00 AM powerCycle - Richard 8:30 AM AMPED UP - Atulan

8:30 AM MATS7 - Anisha 9:00 AM BARRE 57 - Richard

9:15 AM STRENGTH (PUSH) - Richard 9:00 AM STRENGTH LAB (FULL BODY) - Pranjali
10:00 AM  BARRE 57 - Simonelle 10:15 AM CARDIO BARRE EXPRESS - Pranjali
1:30 AM CARDIO BARRE PLUS - Richard 10:30 AM  powerCycle - Richard

5:45 PM MATS57 (EXPRESS) - Pranjali 1:00 AM  MAT 57 - Atulan

6:00 PM powerCycle - Anmol 5:45 PM BARRE 57 - Rohan
6:00PM  FIT-Awlan 6:00PM  STRENGTH LAB (PULL) - Anisha

6:45 PM BARRE 57 - Pranjali 6:00 PM powerCycle - Anmol

7:15 PM STRENGTH (PULL) - Atulan 7:15 PM powerCycle - Rohan
WEDNESDAY THURSDAY

HEDLLY  EREIDEAEES ol 75AM  STRENGTH LAB (PUSH) - Richard

7:30 AM  STRENGTH LAB (PUSH) - Atulan 750 AU 57 Exr e ees M rigakeni

8:00 AM powerCycle - Anmol 8:00 AM powerCycle - Raunak

8:45 AM STRENGTH LAB (PULL) -'Atulan 9:00 AM STRENGTH LAB (PULL) - Mrigakshi
9:00 AM BACK BODY BLAZE - Anisha 9:00 AM BARRE 57 - Richard

9:15 AM BARRES7 - Sovena 9:30 AM powerCycle - Raunak

10:00 AM  powerCycle - Anmol 10:15 AM CARDIO BARRE - Richard

10:15AM  CARDIO BARRE - Atulan _
1:30 AM BARRE 57 - Anisha 5:45 PM PowerCycle - Karan

SELT Y RISy 615PM  BACK BODY BLAZE (EXPRESS) - Atulan
6:00 PM STRENGTH LAB (PUSH) - Rohan ) 7:15 PM STRENGTH LAB (PUSH) - Atulan

6:15 PM CARDIO BARRE EXPRESS - Cauveri 7:15 PM PowerCycle - Karan

7:00 PM BARRE 57 - Simran 7:15 PM BARRE 57 - Sovena

7:15 PM MAT 57 - Cauveri

7:30 PM powerCycle - Rohan


KEMPS
CORNER
STUDIO
SCHEDULE
November 24th - November 30th 2025
BEGINNER : BARRE 57, powerCycle
INTERMEDIATE : CARDIO BARRE , MAT 57, CARDIO BARRE PLUS, FIT, BACK BODY BLAZE,
STRENGTH LAB, powerCycle
ADVANCED : HIIT, AMPED UP!
FRIDAY SATURDAY
7:30 AM BACK BODY BLAZE EXPRESS - Richard 8:00 AM  CARDIO BARRE EXPRESS - Cauveri
8:30 AM powerCycle - Bret 9:00 AM STRENGTH LAB (PUSH) - Rohan
8:30 AM BARRE 57 - Richard 10:00 AM powerCycle - Cauveri
S00AM  FT-Mrgakshi  10:5AM MATS7-Pranjali
10:00 AM  powerCycle - Bret 10:15 AM BARRE 57 - Rohan
11:00 AM STRENGTH LAB (FULL BODY) - Mrigakshi 11:30 AM  powerCycle - Cauveri
1:15 AM CARDIO BARRE - Richard 11:30 AM  BARRE 57 - Pranjali
5:45 PM BARRE 57 - Pranjali 11:30 AM  STRENGTH LAB (PUSH) - Rohan
6:00 PM STRENGTH LAB (FULL BODY) - Anisha 12:30 PM  RECOVERY - Cauveri
7:00 PM CARDIO BARRE PLUS - Pranjali 4:30 PM  CARDIO BARRE EXPRESS - Simran
7:15 PM powerCycle (EXPRESS) - Anisha 5:00 PM  STRENGTH LAB (FULL BODY) - Richard
5:30 PM  BARRE 57 - Simran
6:30 PM  powerCycle - Richard
SUNDAY
10:00 AM  Strength Lab (Full body) - Rohan
10:00 AM  powerCycle - Raunak
10:15 AM  Cardio Barre - Cauveri
1130 AM  powerCycle - Cauveri . TaBaTA
1:30 AM Barre57 - Rohan ICY ISOMETRIC
4:00 PM Barre57 - Simran
5:00PM Powercycle - Bret
5:15 PM Mat57 - Simran`;

console.log('Testing OCR text parsing...');
console.log('Text length:', testOCRText.length);
console.log('\n=== Sample lines ===');
const lines = testOCRText.split('\n');
console.log('Line 1:', lines[0]);
console.log('Line 10:', lines[10]);
console.log('Line 15:', lines[15]);

// Check for merged columns
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
let foundMerged = false;
lines.forEach((line, idx) => {
  const daysInLine = daysOfWeek.filter(day => new RegExp(`\\b${day}\\b`, 'i').test(line));
  if (daysInLine.length >= 2) {
    console.log(`\nLine ${idx} has multiple days: ${daysInLine.join(', ')}`);
    console.log(`Content: "${line}"`);
    foundMerged = true;
  }
});

if (foundMerged) {
  console.log('\n✓ Detected merged column format');
} else {
  console.log('\n✗ No merged columns detected');
}

// Test time extraction from a sample line
const sampleLine = "7:15 AM STRENGTH (PULL) - Anisha 7:30 AM powerCycle - Richard";
console.log('\n=== Testing sample line ===');
console.log('Input:', sampleLine);

// Find all times
const timePattern = /(\d{1,2}[:.]?\d{0,2}\s*(?:AM|PM))/gi;
const times = [];
let match;
while ((match = timePattern.exec(sampleLine)) !== null) {
  times.push(match[1]);
}
console.log('Times found:', times);

// Try to split by times
if (times.length >= 2) {
  const firstTimeIdx = sampleLine.indexOf(times[0]);
  const secondTimeIdx = sampleLine.indexOf(times[1]);
  
  const part1 = sampleLine.substring(0, secondTimeIdx).trim();
  const part2 = sampleLine.substring(secondTimeIdx).trim();
  
  console.log('Part 1:', part1);
  console.log('Part 2:', part2);
}

console.log('\n✓ Test complete');
