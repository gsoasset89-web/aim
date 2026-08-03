'use client';

import UtilityDashboard from '@/components/consumption/utility-dashboard';
import { Droplets } from 'lucide-react';

export default function WaterConsumptionPage() {
  return (
    <main className="p-4 md:p-8">
      <UtilityDashboard type="water" title="Water" icon={Droplets} />
    </main>
  );
}
