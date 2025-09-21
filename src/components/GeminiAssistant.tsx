import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ClassData, PdfClassData } from '@/types/schedule';

export const GeminiAssistant: React.FC = () => {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [csvData, setCsvData] = useState<{[day: string]: ClassData[]} | null>(null);
  const [pdfData, setPdfData] = useState<PdfClassData[] | null>(null);
  const [lastRequestTime, setLastRequestTime] = useState<number>(0);

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
        console.error('Error loading schedule data:', error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Rate limiting: enforce minimum 2 seconds between requests
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    const minInterval = 2000; // 2 seconds

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      setError(`Please wait ${Math.ceil(waitTime / 1000)} more seconds before making another request.`);
      setTimeout(() => setError(''), waitTime);
      return;
    }

    setLastRequestTime(now);
    setLoading(true);
    setError('');
    setResponse('');

    try {
      let scheduleContext = '';
      
      if (csvData && Object.keys(csvData).length > 0) {
        scheduleContext += 'CSV Schedule Data:\n';
        Object.entries(csvData).forEach(([day, classes]) => {
          scheduleContext += `${day}:\n`;
          classes.forEach(cls => {
            scheduleContext += `  - ${cls.className} (${cls.time}) in ${cls.location || 'TBA'} with ${cls.trainer1 || 'TBA'}\n`;
          });
        });
        scheduleContext += '\n';
      }
      
      if (pdfData && pdfData.length > 0) {
        scheduleContext += 'PDF Schedule Data:\n';
        pdfData.forEach(cls => {
          scheduleContext += `  - ${cls.className} (${cls.time}, ${cls.day}) in ${cls.location || 'TBA'} with ${cls.trainer || 'TBA'}\n`;
        });
        scheduleContext += '\n';
      }

      const maxRetries = 3;
      let attempt = 0;

      while (attempt < maxRetries) {
        try {
          const requestBody = {
            input: scheduleContext ? 
              `Context: ${scheduleContext}\n\nUser Question: ${input}` : 
              input
          };

          const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          let data;
          try {
            const responseText = await response.text();
            if (responseText.trim()) {
              data = JSON.parse(responseText);
            } else {
              throw new Error('Empty response from server');
            }
          } catch (jsonError) {
            console.error('JSON parse error:', jsonError);
            throw new Error('Invalid response format from server');
          }

          if (!response.ok) {
            if (response.status === 429) {
              const retryAfter = response.headers.get('Retry-After');
              const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(Math.pow(2, attempt) * 1000, 10000);
              
              if (attempt < maxRetries - 1) {
                setError(`Rate limited. Retrying in ${Math.ceil(delay / 1000)} seconds... (Attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                attempt++;
                setError(''); // Clear the retry message
                continue;
              } else {
                throw new Error(`Rate limit exceeded. Please wait a moment and try again.`);
              }
            } else {
              throw new Error(data.error || data.details || 'Failed to get response from AI');
            }
          }

          setResponse(
            data.candidates?.[0]?.content?.parts?.[0]?.text || 
            data.response || 
            data.message || 
            'No response received'
          );
          break;
        } catch (error) {
          if (attempt === maxRetries - 1) {
            throw error;
          }
          
          // If it's a rate limit error, don't retry with exponential backoff
          if (error instanceof Error && error.message.includes('Rate limit')) {
            throw error;
          }
          
          const delay = Math.min(Math.pow(2, attempt) * 1000, 5000); // Cap at 5 seconds
          setError(`Connection error. Retrying in ${Math.ceil(delay / 1000)} seconds... (Attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt++;
          setError(''); // Clear the retry message
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while processing your request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
          size="lg"
        >
          💬
        </Button>
      </div>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-h-[80vh]">
          <Card className="shadow-xl border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">AI Schedule Assistant</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0"
                >
                  ✕
                </Button>
              </div>
              <p className="text-xs text-gray-600">
                Ask me anything about your schedule data!
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about your schedule..."
                    className="text-sm"
                    disabled={loading}
                  />
                  <Button 
                    type="submit" 
                    disabled={loading || !input.trim()}
                    size="sm"
                  >
                    {loading ? '...' : 'Ask'}
                  </Button>
                </div>
              </form>
              
              {error && (
                <Alert className="text-xs" variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {loading && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-blue-700">AI is thinking...</span>
                </div>
              )}
              
              {response && (
                <div className="max-h-60 overflow-y-auto">
                  <Card className="bg-gray-50">
                    <CardContent className="pt-3 pb-3">
                      <div className="whitespace-pre-wrap text-xs leading-relaxed">
                        {response}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default GeminiAssistant;
