
'use client';

import UtilityDashboard from '@/components/consumption/utility-dashboard';
import { Fuel } from 'lucide-react';

export default function FuelConsumptionPage() {
  return (
    <main className="p-4 md:p-8">
      <UtilityDashboard type="fuel" title="Fuel" icon={Fuel} />
    </main>
  );
}
