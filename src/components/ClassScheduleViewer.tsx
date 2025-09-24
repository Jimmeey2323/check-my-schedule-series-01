
import { useState, useEffect, Suspense, lazy } from 'react';
import { TabGroup } from './TabGroup';
import { CsvViewer } from './viewers/CsvViewer';
import { ClassData, PdfClassData } from '@/types/schedule';
import { toast } from '@/hooks/use-toast';

// Lazy load PDF-related components since they use heavy libraries
const PdfViewer = lazy(() => import('./viewers/PdfViewer').then(module => ({ default: module.PdfViewer })));
const ComparisonViewer = lazy(() => import('./viewers/ComparisonViewer').then(module => ({ default: module.ComparisonViewer })));
const SideBySideViewer = lazy(() => import('./viewers/SideBySideViewer').then(module => ({ default: module.SideBySideViewer })));
const QuickMismatchViewer = lazy(() => import('./viewers/QuickMismatchViewer').then(module => ({ default: module.QuickMismatchViewer })));

export function ClassScheduleViewer() {
  const [activeTab, setActiveTab] = useState('csv');
  const [csvData, setCsvData] = useState<{[day: string]: ClassData[]} | null>(null);
  const [pdfData, setPdfData] = useState<PdfClassData[] | null>(null);
  
  // Load saved data from localStorage on component mount
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
          <Suspense fallback={<div className="flex items-center justify-center p-8">Loading PDF viewer...</div>}>
            <PdfViewer 
              savedData={pdfData}
              onDataUpdate={handlePdfDataUpdate}
            />
          </Suspense>
        )}
        
        {activeTab === 'compare' && (
          <Suspense fallback={<div className="flex items-center justify-center p-8">Loading comparison viewer...</div>}>
            <ComparisonViewer 
              csvData={csvData}
              pdfData={pdfData}
            />
          </Suspense>
        )}

        {activeTab === 'side-by-side' && (
          <Suspense fallback={<div className="flex items-center justify-center p-8">Loading side-by-side viewer...</div>}>
            <SideBySideViewer
              csvData={csvData}
              pdfData={pdfData}
            />
          </Suspense>
        )}

        {activeTab === 'quick-mismatch' && (
          <Suspense fallback={<div className="flex items-center justify-center p-8">Loading mismatch viewer...</div>}>
            <QuickMismatchViewer
              csvData={csvData}
              pdfData={pdfData}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
