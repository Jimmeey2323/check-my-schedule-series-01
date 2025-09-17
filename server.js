import express from 'express';
import cors from 'cors';

const app = express();
const port = 3001;

const GEMINI_API_KEY = 'AIzaSyAq_QgITLnhKtvKrFhOw-rvHc0G8FURgPM';
const MODEL_ID = 'gemini-2.0-flash-exp';
const GENERATE_CONTENT_API = 'generateContent';

app.use(cors());
app.use(express.json());

// Schedule data processing utilities
const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const allowedNames = [
  'Rohan', 'Anisha', 'Richard', 'Pranjali', 'Reshma', 'Atulan', 'Karanvir',
  'Cauveri', 'Mrigakshi', 'Vivaran', 'Karan', 'Nishanth', 'Pushyank',
  'Kajol', 'Siddhartha', 'Shruti K'
];

const classNameMappings = {
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
  'Amped Up': 'Amped Up!'
};

// Helper functions for data processing
function normalizeClassName(raw) {
  if (!raw) return '';
  let val = raw.trim().replace(/\s+/g, ' ').toLowerCase();
  
  for (const [key, value] of Object.entries(classNameMappings)) {
    if (val === key.toLowerCase()) {
      return value;
    }
  }
  return raw;
}

function normalizeTrainerName(raw) {
  if (!raw) return '';
  
  const val = raw.trim().toLowerCase();
  if (val === 'mriga') return 'Mrigakshi';
  if (val === 'nishant') return 'Nishanth';

  for (const name of allowedNames) {
    if (val === name.toLowerCase()) return name;
  }

  for (const name of allowedNames) {
    if (val.includes(name.toLowerCase())) return name;
  }

  return raw.trim();
}

function parseTimeToDate(timeStr) {
  if (!timeStr) return null;

  const today = new Date();
  let time = timeStr.trim().toUpperCase().replace(/\./g, ':');

  const ampmMatch = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const minute = parseInt(ampmMatch[2], 10);
    const ampm = ampmMatch[3].toUpperCase();

    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    return new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, minute);
  }

  return null;
}

function formatTime(date) {
  if (!date) return '';
  
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minStr = minutes < 10 ? '0' + minutes : minutes;
  
  return `${hours}:${minStr} ${ampm}`;
}

// Advanced schedule analysis functions
function findTimeConflicts(scheduleData) {
  const conflicts = [];
  
  Object.entries(scheduleData).forEach(([day, classes]) => {
    classes.forEach((class1, i) => {
      classes.slice(i + 1).forEach(class2 => {
        if (class1.timeDate && class2.timeDate) {
          const timeDiff = Math.abs(class1.timeDate.getTime() - class2.timeDate.getTime());
          const minutesDiff = timeDiff / (1000 * 60);
          
          // Consider classes conflicting if they're within 30 minutes of each other
          if (minutesDiff < 30) {
            conflicts.push({
              day,
              class1: `${class1.className} at ${class1.time} with ${class1.trainer1} in ${class1.location}`,
              class2: `${class2.className} at ${class2.time} with ${class2.trainer1} in ${class2.location}`,
              timeDiff: `${Math.round(minutesDiff)} minutes apart`
            });
          }
        }
      });
    });
  });
  
  return conflicts;
}

function findScheduleGaps(scheduleData) {
  const gaps = [];
  
  Object.entries(scheduleData).forEach(([day, classes]) => {
    const sortedClasses = classes
      .filter(cls => cls.timeDate)
      .sort((a, b) => a.timeDate.getTime() - b.timeDate.getTime());
    
    for (let i = 0; i < sortedClasses.length - 1; i++) {
      const current = sortedClasses[i];
      const next = sortedClasses[i + 1];
      
      const gapMinutes = (next.timeDate.getTime() - current.timeDate.getTime()) / (1000 * 60);
      
      if (gapMinutes > 60) { // Gaps longer than 1 hour
        gaps.push({
          day,
          after: `${current.className} at ${current.time}`,
          before: `${next.className} at ${next.time}`,
          duration: `${Math.round(gapMinutes / 60 * 10) / 10} hours`
        });
      }
    }
  });
  
  return gaps;
}

function getTrainerWorkload(scheduleData) {
  const trainerStats = {};
  
  Object.entries(scheduleData).forEach(([day, classes]) => {
    classes.forEach(cls => {
      const trainer = cls.trainer1 || cls.trainer;
      if (!trainer) return;
      
      if (!trainerStats[trainer]) {
        trainerStats[trainer] = {
          totalClasses: 0,
          dayDistribution: {},
          classes: []
        };
      }
      
      trainerStats[trainer].totalClasses++;
      trainerStats[trainer].dayDistribution[day] = (trainerStats[trainer].dayDistribution[day] || 0) + 1;
      trainerStats[trainer].classes.push({
        day,
        time: cls.time,
        className: cls.className,
        location: cls.location
      });
    });
  });
  
  return trainerStats;
}

function analyzeClassDistribution(scheduleData) {
  const classStats = {};
  const locationStats = {};
  const dayStats = {};
  
  Object.entries(scheduleData).forEach(([day, classes]) => {
    dayStats[day] = classes.length;
    
    classes.forEach(cls => {
      // Class type distribution
      const className = cls.className;
      classStats[className] = (classStats[className] || 0) + 1;
      
      // Location distribution
      const location = cls.location;
      locationStats[location] = (locationStats[location] || 0) + 1;
    });
  });
  
  return { classStats, locationStats, dayStats };
}

function generateScheduleInsights(scheduleData) {
  const conflicts = findTimeConflicts(scheduleData);
  const gaps = findScheduleGaps(scheduleData);
  const trainerWorkload = getTrainerWorkload(scheduleData);
  const distribution = analyzeClassDistribution(scheduleData);
  
  return {
    conflicts,
    gaps,
    trainerWorkload,
    distribution,
    totalClasses: Object.values(scheduleData).flat().length,
    daysWithClasses: Object.keys(scheduleData).length
  };
}

app.use(cors());
app.use(express.json());

app.post('/api/gemini', async (req, res) => {
  try {
    const { input } = req.body;
    
    if (!input) {
      return res.status(400).json({ error: 'Input is required' });
    }

    // Extract schedule data from the input
    let scheduleData = null;
    let enhancedInput = input;
    
    // Try to parse schedule data from the input
    const csvDataMatch = input.match(/CSV Schedule Data:\s*([\s\S]*?)(?=\n\nPDF Schedule Data:|$)/);
    const pdfDataMatch = input.match(/PDF Schedule Data:\s*([\s\S]*?)(?=\n\n|$)/);
    
    if (csvDataMatch || pdfDataMatch) {
      // Parse the schedule data to generate insights
      scheduleData = {};
      
      if (csvDataMatch) {
        const csvText = csvDataMatch[1];
        const dayMatches = csvText.match(/(\w+):\s*\n((?:\s*-.*\n?)*)/g);
        
        if (dayMatches) {
          dayMatches.forEach(dayBlock => {
            const [, day, classesText] = dayBlock.match(/(\w+):\s*\n((?:\s*-.*\n?)*)/);
            const classes = [];
            
            const classMatches = classesText.match(/\s*-\s*([^(]+)\(([^)]+)\) in ([^w]+) with (.+)/g);
            if (classMatches) {
              classMatches.forEach(classMatch => {
                const [, className, time, location, trainer] = classMatch.match(/\s*-\s*([^(]+)\(([^)]+)\) in ([^w]+) with (.+)/) || [];
                if (className && time && location && trainer) {
                  const timeDate = parseTimeToDate(time.trim());
                  classes.push({
                    className: className.trim(),
                    time: time.trim(),
                    timeDate,
                    location: location.trim(),
                    trainer1: trainer.trim(),
                    day
                  });
                }
              });
            }
            
            if (classes.length > 0) {
              scheduleData[day] = classes;
            }
          });
        }
      }
      
      // Generate insights if we have schedule data
      if (scheduleData && Object.keys(scheduleData).length > 0) {
        const insights = generateScheduleInsights(scheduleData);
        
        // Add insights to the input for Gemini
        enhancedInput += `\n\nSCHEDULE ANALYSIS INSIGHTS:

CONFLICTS DETECTED:
${insights.conflicts.length > 0 ? 
  insights.conflicts.map(c => `• ${c.day}: ${c.class1} conflicts with ${c.class2} (${c.timeDiff})`).join('\n') : 
  '• No time conflicts detected'
}

SCHEDULE GAPS:
${insights.gaps.length > 0 ? 
  insights.gaps.map(g => `• ${g.day}: ${g.duration} gap between ${g.after} and ${g.before}`).join('\n') : 
  '• No significant gaps found'
}

TRAINER WORKLOAD:
${Object.entries(insights.trainerWorkload).map(([trainer, stats]) => 
  `• ${trainer}: ${stats.totalClasses} classes across ${Object.keys(stats.dayDistribution).length} days`
).join('\n')}

CLASS DISTRIBUTION BY DAY:
${Object.entries(insights.distribution.dayStats).map(([day, count]) => 
  `• ${day}: ${count} classes`
).join('\n')}

MOST POPULAR CLASSES:
${Object.entries(insights.distribution.classStats)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 5)
  .map(([className, count]) => `• ${className}: ${count} sessions`)
  .join('\n')}

LOCATION USAGE:
${Object.entries(insights.distribution.locationStats)
  .sort(([,a], [,b]) => b - a)
  .map(([location, count]) => `• ${location}: ${count} classes`)
  .join('\n')}

SUMMARY: ${insights.totalClasses} total classes across ${insights.daysWithClasses} days`;
      }
    }

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { 
              text: `${enhancedInput}

IMPORTANT INSTRUCTIONS:
- Do NOT use markdown formatting in your response
- Use plain text with clear structure
- For tables, use simple text formatting with spaces and dashes
- Use bullet points with • symbol
- Use numbered lists with 1., 2., 3.
- Make responses specific to the actual schedule data provided
- Reference specific class names, times, trainers, and locations from the data
- If asked about conflicts, gaps, or analysis, use the insights provided above
- Be concise and actionable in your suggestions`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    };

    console.log('Making request to Gemini API...');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:${GENERATE_CONTENT_API}?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `API Error: ${response.status}`,
        details: errorText
      });
    }

    const result = await response.json();
    console.log('Gemini response received');
    res.json(result);
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

app.listen(port, () => {
  console.log(`Gemini API server running at http://localhost:${port}`);
});