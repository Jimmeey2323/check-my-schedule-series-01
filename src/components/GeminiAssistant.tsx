import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ClassData, PdfClassData } from '@/types/schedule';

const GeminiAssistant: React.FC = () => {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [csvData, setCsvData] = useState<{[day: string]: ClassData[]} | null>(null);
  const [pdfData, setPdfData] = useState<PdfClassData[] | null>(null);

  // Load schedule data from localStorage
  useEffect(() => {
    try {
      const savedCsvData = localStorage.getItem('csvScheduleData');
      if (savedCsvData) {
        setCsvData(JSON.parse(savedCsvData));
      }
      
      const savedPdfData = localStorage.getItem('pdfScheduleData');
      if (savedPdfData) {
        setPdfData(JSON.parse(savedPdfData));
      }
    } catch (error) {
      console.error('Error loading schedule data:', error);
    }
  }, []);

  // Listen for storage changes to update data when new files are uploaded
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const savedCsvData = localStorage.getItem('csvScheduleData');
        if (savedCsvData) {
          setCsvData(JSON.parse(savedCsvData));
        }
        
        const savedPdfData = localStorage.getItem('pdfScheduleData');
        if (savedPdfData) {
          setPdfData(JSON.parse(savedPdfData));
        }
      } catch (error) {
        console.error('Error loading updated schedule data:', error);
      }
    };

    // Listen for storage events and custom events
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('scheduleDataUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('scheduleDataUpdated', handleStorageChange);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setLoading(true);
    setResponse('');
    setError('');
    
    try {
      // Prepare schedule context for Gemini
      let scheduleContext = '';
      
      if (csvData && Object.keys(csvData).length > 0) {
        scheduleContext += '\n\nCSV Schedule Data:\n';
        Object.entries(csvData).forEach(([day, classes]) => {
          scheduleContext += `${day}:\n`;
          classes.forEach(cls => {
            scheduleContext += `  - ${cls.className} (${cls.time}) in ${cls.location || 'TBA'} with ${cls.trainer1 || 'TBA'}\n`;
          });
        });
      }
      
      if (pdfData && pdfData.length > 0) {
        scheduleContext += '\n\nPDF Schedule Data:\n';
        pdfData.forEach(cls => {
          scheduleContext += `  - ${cls.className} (${cls.time}) in ${cls.location || 'TBA'} with ${cls.trainer || 'TBA'}\n`;
        });
      }
      
      if (!scheduleContext) {
        scheduleContext = '\n\nNo schedule data has been uploaded yet. Please upload a CSV or PDF schedule file first.';
      }
      
      const contextualInput = `${input.trim()}${scheduleContext}

Please analyze the above schedule data and provide specific insights, suggestions, or answers related to this actual schedule. Be specific and reference actual course codes, times, and details from the data provided.`;
      
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: contextualInput }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      
      const data = await res.json();
      const aiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (aiResponse) {
        setResponse(aiResponse);
      } else {
        setError('No response received from Gemini AI');
      }
    } catch (err) {
      console.error('Gemini API error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get response from Gemini AI');
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          ✨ Gemini AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={csvData || pdfData ? 
                "Ask about your schedule: conflicts, gaps, suggestions..." : 
                "Upload a schedule file first, then ask questions about it..."
              }
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              {loading ? 'Thinking...' : 'Ask'}
            </Button>
          </div>
        </form>
        
        {error && (
          <Alert className="mt-4" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {response && (
          <Card className="mt-4">
            <CardContent className="pt-4">
              <div className="whitespace-pre-wrap text-sm">
                {response}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

export default GeminiAssistant;
