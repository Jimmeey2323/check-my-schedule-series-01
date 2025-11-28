
import { useState, useEffect } from 'react';
import { TabGroup } from './TabGroup';
import { CsvViewer } from './viewers/CsvViewer';
import { PdfViewer } from './viewers/PdfViewer';
import { SideBySideViewer } from './viewers/SideBySideViewer';
import { OriginalFilesViewer } from './viewers/OriginalFilesViewer';
import { RawOcsDataViewer } from './viewers/RawOcsDataViewer';
import { ClassData, PdfClassData } from '@/types/schedule';
import { toast } from '@/hooks/use-toast';

export function ClassScheduleViewer() {
  const [activeTab, setActiveTab] = useState('csv');
  const [csvData, setCsvData] = useState<{[day: string]: ClassData[]} | null>(null);
  const [pdfData, setPdfData] = useState<PdfClassData[] | null>(null);
  
  // Clear all data on app load - start fresh every time
  useEffect(() => {
    // Clear all stored data on page load
    localStorage.removeItem('csvScheduleData');
    localStorage.removeItem('pdfScheduleData');
    localStorage.removeItem('originalCsvText');
    localStorage.removeItem('csvFileName');
    localStorage.removeItem('csvUploadDate');
    localStorage.removeItem('csvFilters');
    localStorage.removeItem('cleanedOcrData');
    localStorage.removeItem('rawOcrText');
    // Clear original files data
    localStorage.removeItem('originalPdfBlob');
    localStorage.removeItem('pdfFileName');
    localStorage.removeItem('pdfUploadDate');
    localStorage.removeItem('originalPdfOcrText');
    localStorage.removeItem('pdfOcrTimestamp');
    
    // Reset state
    setCsvData(null);
    setPdfData(null);
    
    // Dispatch event to notify components that data was cleared
    window.dispatchEvent(new CustomEvent('scheduleDataCleared'));
    
    console.log('App loaded: All previous data cleared');
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
    { id: 'raw-ocs', label: 'Raw Data' },
    { id: 'originals', label: 'Original Files' },
    { id: 'side-by-side', label: 'Comparison' }
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

  const handleClearAllData = () => {
    // Clear all state
    setCsvData(null);
    setPdfData(null);
    
    // Switch to first tab
    setActiveTab('csv');
    
    // Show confirmation toast
    toast({
      title: "All Data Cleared",
      description: "All schedule data and files have been permanently removed from all tabs.",
      variant: "destructive",
    });
  };

  return (
    <div className="flex flex-col h-full">
      <TabGroup 
        tabs={tabs} 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onClearAllData={handleClearAllData}
      />
      
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
        
        {activeTab === 'raw-ocs' && (
          <RawOcsDataViewer
            csvData={csvData}
            pdfData={pdfData}
          />
        )}
        
        {activeTab === 'originals' && (
          <OriginalFilesViewer />
        )}

        {activeTab === 'side-by-side' && (
          <SideBySideViewer
            csvData={csvData}
            pdfData={pdfData}
          />
        )}
      </div>
    </div>
  );
}
