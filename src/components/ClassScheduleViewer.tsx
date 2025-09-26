
import { useState, useEffect } from 'react';
import { TabGroup } from './TabGroup';
import { CsvViewer } from './viewers/CsvViewer';
import { PdfViewer } from './viewers/PdfViewer';
import { ComparisonViewer } from './viewers/ComparisonViewer';
import { SideBySideViewer } from './viewers/SideBySideViewer';
import { QuickMismatchViewer } from './viewers/QuickMismatchViewer';
import { OriginalFilesViewer } from './viewers/OriginalFilesViewer';
import { ClassData, PdfClassData } from '@/types/schedule';
import { toast } from '@/hooks/use-toast';

export function ClassScheduleViewer() {
  const [activeTab, setActiveTab] = useState('csv');
  const [csvData, setCsvData] = useState<{[day: string]: ClassData[]} | null>(null);
  const [pdfData, setPdfData] = useState<PdfClassData[] | null>(null);
  
  // Load saved data from localStorage on component mount
  useEffect(() => {
    try {
      const savedCsvData = localStorage.getItem('csvScheduleData');
      if (savedCsvData) {
        const parsedData = JSON.parse(savedCsvData);
        // Reconstruct Date objects for timeDate fields
        const reconstructedData: {[day: string]: ClassData[]} = {};
        Object.entries(parsedData).forEach(([day, classes]) => {
          reconstructedData[day] = (classes as ClassData[]).map(cls => ({
            ...cls,
            timeDate: cls.timeDate ? new Date(cls.timeDate) : null
          }));
        });
        setCsvData(reconstructedData);
      }
      
      const savedPdfData = localStorage.getItem('pdfScheduleData');
      if (savedPdfData) {
        setPdfData(JSON.parse(savedPdfData));
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (csvData) {
      localStorage.setItem('csvScheduleData', JSON.stringify(csvData));
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('scheduleDataUpdated'));
    }
    
    if (pdfData) {
      localStorage.setItem('pdfScheduleData', JSON.stringify(pdfData));
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('scheduleDataUpdated'));
    }
  }, [csvData, pdfData]);

  const tabs = [
    { id: 'csv', label: 'CSV Schedule' },
    { id: 'pdf', label: 'PDF Schedule' },
    { id: 'originals', label: 'Original Files' },
    { id: 'compare', label: 'Comparison' },
    { id: 'side-by-side', label: 'Side by Side' },
    { id: 'quick-mismatch', label: 'Quick Mismatch' }
  ];

  const handleCsvDataUpdate = (data: {[day: string]: ClassData[]}) => {
    setCsvData(data);
    toast({
      title: "CSV Data Updated",
      description: "Your CSV schedule data has been successfully processed and saved.",
    });
  };

  const handlePdfDataUpdate = (data: PdfClassData[]) => {
    setPdfData(data);
    toast({
      title: "PDF Data Updated",
      description: "Your PDF schedule data has been successfully processed and saved.",
    });
  };

  return (
    <div className="flex flex-col h-full">
      <TabGroup tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="flex-grow flex flex-col" style={{ minHeight: 0 }}>
        {activeTab === 'csv' && (
          <CsvViewer 
            savedData={csvData} 
            onDataUpdate={handleCsvDataUpdate}
          />
        )}
        
        {activeTab === 'pdf' && (
          <PdfViewer 
            savedData={pdfData}
            onDataUpdate={handlePdfDataUpdate}
          />
        )}
        
        {activeTab === 'originals' && (
          <OriginalFilesViewer />
        )}
        
        {activeTab === 'compare' && (
          <ComparisonViewer 
            csvData={csvData}
            pdfData={pdfData}
          />
        )}

        {activeTab === 'side-by-side' && (
          <SideBySideViewer
            csvData={csvData}
            pdfData={pdfData}
          />
        )}

        {activeTab === 'quick-mismatch' && (
          <QuickMismatchViewer
            csvData={csvData}
            pdfData={pdfData}
          />
        )}
      </div>
    </div>
  );
}
