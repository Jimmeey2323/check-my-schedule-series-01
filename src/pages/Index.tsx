
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { ClassScheduleViewer } from '@/components/ClassScheduleViewer';
import { toast } from '@/hooks/use-toast';

export default function Index() {
  return (
    <Layout>
      <ClassScheduleViewer />
    </Layout>
  );
}
