
import { useState, Suspense, lazy } from 'react';
import { Layout } from '@/components/Layout';
import { ClassScheduleViewer } from '@/components/ClassScheduleViewer';
import { toast } from '@/hooks/use-toast';

// Lazy load heavy components
const GeminiAssistant = lazy(() => import('@/components/GeminiAssistant'));

export default function Index() {
  return (
    <Layout>
      <ClassScheduleViewer />
      <Suspense fallback={<div className="flex items-center justify-center p-8">Loading AI Assistant...</div>}>
        <GeminiAssistant />
      </Suspense>
    </Layout>
  );
}
