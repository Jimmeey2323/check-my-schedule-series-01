
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { ClassScheduleViewer } from '@/components/ClassScheduleViewer';
import GeminiAssistant from '@/components/GeminiAssistant';
import { toast } from '@/hooks/use-toast';

export default function Index() {
  return (
    <Layout>
      <ClassScheduleViewer />
      <div style={{ marginTop: 32 }}>
        <GeminiAssistant />
      </div>
    </Layout>
  );
}
