
'use client';

import UtilityDashboard from '@/components/consumption/utility-dashboard';
import { Zap } from 'lucide-react';

export default function ElectricityConsumptionPage() {
  return (
    <main className="p-4 md:p-8">
      <UtilityDashboard type="electricity" title="Electricity" icon={Zap} />
    </main>
  );
}
