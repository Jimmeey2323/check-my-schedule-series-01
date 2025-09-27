# OCR Text Sample for Testing

If you want to test the Raw OCS Data viewer without uploading a PDF, you can manually add some sample OCR text to localStorage to see how the interface works.

Open the browser's Developer Console and run this command:

```javascript
// Sample OCR text that might be extracted from a PDF schedule
const sampleOcrText = `MONDAY
06:00 Studio Barre 57 - Anisha Shah - Bandra
07:00 Studio HIIT - Rohan Dahima - Bandra  
08:00 Studio Pilates - Pranjali Jain - Powai
18:00 Studio Dance - Mrigakshi Jaiswal - Bandra
19:00 Studio Strength - Karanvir Bhatia - Powai

TUESDAY  
06:30 Studio Flow - Reshma Sharma - Bandra
07:30 Studio Core - Richard D'Costa - Bandra
09:00 Studio Balance - Upasna Paranjpe - Powai
18:30 Studio Cardio - Karan Bhatia - Bandra
19:30 Studio Flex - Saniya Jaiswal - Powai

WEDNESDAY
06:00 Studio Power - Vivaran Dhasmana - Bandra
07:00 Studio Zen - Nishanth Raj - Bandra  
08:30 Studio Fusion - Cauveri Vikrant - Powai
18:00 Studio Burn - Kabir Varma - Bandra
19:00 Studio Stretch - Simonelle De Vitre - Powai

SPECIAL EVENTS:
SATURDAY: DRAKE VS RIHANNA Studio Barre 57 - Multiple Trainers
SUNDAY: BEAT THE TRAINER Studio HIIT - Special Event`;

// Store the sample OCR text
localStorage.setItem('originalPdfOcrText', sampleOcrText);
localStorage.setItem('pdfOcrTimestamp', new Date().toISOString());

// Refresh the page to see the changes
window.location.reload();
```

This will populate the Raw OCS Data tab with sample OCR text so you can test:
- The PDF OCR tab functionality
- Search within OCR text
- Copy and download functionality
- OCR text analysis features

After running this, navigate to the Raw OCS Data tab and click on "PDF OCR" to see the sample text.