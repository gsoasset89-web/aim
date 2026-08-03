'use client';

import React, { useState, useMemo, useEffect, useCallback, Fragment } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { 
  History, 
  TrendingUp, 
  LineChart as LineChartIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
  Settings2,
  HelpCircle,
  AlertTriangle,
  RotateCcw,
  FilterX,
  ExternalLink,
  CheckCircle2,
  Search as SearchIcon,
  LayoutList,
  Car,
  Check,
  ChevronsUpDown,
  CalendarDays,
  Trophy,
  Users,
  Percent,
  AlertCircle
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { fetchCsvData } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_SHEETS = {
  fuel: 'https://docs.google.com/spreadsheets/d/1G4JrUI2P9KhOG-x6ErE_oDUSadh6yMNzvWpZ3YSibOE/edit?pli=1&gid=1518119111#gid=1518119111',
  vehicle_master: 'https://docs.google.com/spreadsheets/d/1G4JrUI2P9KhOG-x6ErE_oDUSadh6yMNzvWpZ3YSibOE/edit?gid=1504080737',
  electricity: 'https://docs.google.com/spreadsheets/d/19oe9VB9MKXn0QSAYxwqzp1LYw9nLX_OQgc9c1QMU7ro/edit?gid=1842542183#gid=1842542183',
  electricity_ledger: 'https://docs.google.com/spreadsheets/d/19oe9VB9MKXn0QSAYxwqzp1LYw9nLX_OQgc9c1QMU7ro/edit?gid=1461192828#gid=1461192828',
  water_matrix: 'https://docs.google.com/spreadsheets/d/137fHdicDr8RVJLxELveNf_GIQtyZMQssWLViO09iZO0/edit?gid=1106305648#gid=1106305648',
  water_logs: 'https://docs.google.com/spreadsheets/d/137fHdicDr8RVJLxELveNf_GIQtyZMQssWLViO09iZO0/edit?gid=0#gid=0',
};

const MONTHS_ORDER = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const S1_MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE"];
const S2_MONTHS = ["JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

const TrendComparison = ({ data, unit }: { data: { month: string, amount: number }[], unit: string }) => {
  const [monthA, setMonthA] = useState('JANUARY');
  const [monthB, setMonthB] = useState('FEBRUARY');

  const getMonthVal = (mName: string) => {
    const entry = data.find(d => d.month === mName.substring(0, 3));
    return entry ? entry.amount : 0;
  };

  const valA = getMonthVal(monthA);
  const valB = getMonthVal(monthB);
  
  const percentChange = useMemo(() => {
    if (valA === 0) return valB > 0 ? 100 : 0;
    return ((valB - valA) / valA) * 100;
  }, [valA, valB]);

  return (
    <Card className="bg-[#1e293b]/30 border-[#334155]">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-blue-400" /> Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase font-bold">Month A</Label>
            <Select value={monthA} onValueChange={setMonthA}>
              <SelectTrigger className="h-8 bg-[#0f172a] border-[#334155] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS_ORDER.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase font-bold">Month B</Label>
            <Select value={monthB} onValueChange={setMonthB}>
              <SelectTrigger className="h-8 bg-[#0f172a] border-[#334155] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS_ORDER.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-[#0f172a] rounded-lg p-6 border border-[#334155] flex flex-col items-center justify-center text-center">
          <span className="text-[10px] text-muted-foreground uppercase font-bold mb-2">Change</span>
          <div className={cn(
            "flex items-center gap-2 text-2xl font-bold",
            percentChange > 0 ? "text-red-500" : percentChange < 0 ? "text-green-500" : "text-gray-400"
          )}>
            {percentChange > 0 ? <ArrowUpRight className="h-6 w-6" /> : percentChange < 0 ? <ArrowDownRight className="h-6 w-6" /> : null}
            {Math.abs(percentChange).toFixed(1)}%
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Difference: {(valB - valA).toLocaleString(undefined, { minimumFractionDigits: 2 })} {unit}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default function ConsumptionPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('fuel');
  const [selectedParent, setSelectedParent] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  
  const [records, setRecords] = useState<Record<string, any[]>>({
    fuel: [],
    electricity: [],
    water_matrix: [],
    water_logs: [],
    electricity_ledger: [],
    vehicle_master: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  
  const [sheetUrls, setSheetUrls] = useState({
    fuel: typeof window !== 'undefined' ? localStorage.getItem('consumption_url_fuel') || DEFAULT_SHEETS.fuel : DEFAULT_SHEETS.fuel,
    vehicle_master: typeof window !== 'undefined' ? localStorage.getItem('consumption_url_vehicle_master') || DEFAULT_SHEETS.vehicle_master : DEFAULT_SHEETS.vehicle_master,
    electricity: typeof window !== 'undefined' ? localStorage.getItem('consumption_url_electricity') || DEFAULT_SHEETS.electricity : DEFAULT_SHEETS.electricity,
    electricity_ledger: typeof window !== 'undefined' ? localStorage.getItem('consumption_url_electricity_ledger') || DEFAULT_SHEETS.electricity_ledger : DEFAULT_SHEETS.electricity_ledger,
    water_matrix: DEFAULT_SHEETS.water_matrix,
    water_logs: DEFAULT_SHEETS.water_logs,
  });

  const getExportUrl = useCallback((rawUrl: string) => {
    if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') return null;
    try {
      const spreadsheetIdMatch = rawUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const gidMatch = rawUrl.match(/gid=([0-9]+)/);
      if (!spreadsheetIdMatch) return null;
      return `https://docs.google.com/spreadsheets/d/${spreadsheetIdMatch[1]}/export?format=csv&gid=${gidMatch ? gidMatch[1] : '0'}`;
    } catch (e) { return null; }
  }, []);

  const splitRow = (row: string) => {
    const result = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) { result.push(cell.trim().replace(/^"|"$/g, '')); cell = ''; }
      else cell += char;
    }
    result.push(cell.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const parseNumber = (v: string) => {
    if (!v || v === '-' || v === 'n/a' || v === '.' || v.trim() === '') return 0;
    const cleaned = v.replace(/[₱,$\s]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const parseRecords = useCallback((csvText: string, type: string): any[] => {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== '');
    const results: any[] = [];

    let headerRowIdx = -1;
    let dataStartRowIdx = -1;
    let monthsDataColIndex = -1;
    
    for (let i = 0; i < Math.min(lines.length, 50); i++) {
      const row = splitRow(lines[i]);
      const upperRow = row.map(c => c.toUpperCase());
      const foundIdx = upperRow.findIndex(cell => cell.includes('JANUARY'));
      if (foundIdx !== -1) {
        headerRowIdx = i;
        monthsDataColIndex = foundIdx;
        dataStartRowIdx = i + 2; 
        break;
      }
    }

    if (headerRowIdx === -1 && (type.includes('water') || type.includes('electricity'))) return [];

    let lastKnownFacility = '';

    lines.forEach((line, idx) => {
        if (idx < dataStartRowIdx && type !== 'fuel' && type !== 'vehicle_master') return;
        
        const cols = splitRow(line);
        if (cols.length < 2) return;

        if (type === 'vehicle_master') {
            const plate = cols[0]?.trim();
            if (plate && plate.length > 2 && idx > 0 && !plate.includes('PLATE')) {
                results.push({ plate });
            }
        } else if (type === 'water_logs') {
            let facilityName = cols[0]?.trim();
            if (!facilityName || facilityName === '') facilityName = lastKnownFacility;
            else lastKnownFacility = facilityName;
            if (!facilityName || facilityName.toUpperCase().includes('TOTAL')) return;
            const monthlyData: any = {};
            MONTHS_ORDER.forEach((m, mIdx) => {
                const energyIdx = 3 + (mIdx * 2);
                const amountIdx = 4 + (mIdx * 2);
                monthlyData[m] = { energy: parseNumber(cols[energyIdx]), amount: parseNumber(cols[amountIdx]) };
            });
            results.push({ id: `water-log-${idx}`, building: facilityName, office: cols[1]?.trim() || '-', accountNo: cols[2]?.trim() || '-', monthly: monthlyData, type: 'water', year: 2026 });
        } else if (type === 'water_matrix') {
            const officeName = cols[0]?.trim();
            if (!officeName || officeName === '' || officeName.toUpperCase() === 'GRAND TOTAL') return;
            const monthlyData: any = {};
            MONTHS_ORDER.forEach((m, mIdx) => {
                const energyIdx = 1 + (mIdx * 2);
                const amountIdx = 2 + (mIdx * 2);
                monthlyData[m] = { energy: parseNumber(cols[energyIdx]), amount: parseNumber(cols[amountIdx]) };
            });
            results.push({ id: `water-matrix-${idx}`, building: officeName, office: officeName, accountNo: '-', monthly: monthlyData, type: 'water', year: 2026 });
        } else if (type === 'electricity' || type === 'electricity_ledger') {
            let facilityNameRaw = cols[0]?.trim();
            if (!facilityNameRaw || facilityNameRaw === '') facilityNameRaw = lastKnownFacility;
            else lastKnownFacility = facilityNameRaw;
            if (!facilityNameRaw) return;
            const upperName = facilityNameRaw.toUpperCase();
            
            const headerKeywords = ['GRAND TOTAL', 'PERIOD COVERED', 'FACILITY', 'PARENT OFFICE'];
            if (headerKeywords.some(k => upperName === k)) return;
            
            let dataStartIndex = monthsDataColIndex !== -1 ? monthsDataColIndex : (type === 'electricity' ? 1 : 3);
            let parentOffice = (dataStartIndex > 1 && cols[1]) ? cols[1].trim() : ''; 
            let accountNo = (dataStartIndex > 2 && cols[2]) ? cols[2].trim() : '';
            
            const monthlyData: any = {};
            let rowHasData = false;
            MONTHS_ORDER.forEach((m, mIdx) => {
                const energyVal = parseNumber(cols[dataStartIndex + (mIdx * 2)]);
                const amountVal = parseNumber(cols[dataStartIndex + 1 + (mIdx * 2)]);
                monthlyData[m] = { energy: energyVal, amount: amountVal };
                if (energyVal !== 0 || amountVal !== 0) rowHasData = true;
            });

            if (!rowHasData && type === 'electricity_ledger') return;

            results.push({
                id: `${type}-${idx}`,
                building: facilityNameRaw,
                parentOffice: parentOffice,
                accountNo: accountNo,
                monthly: monthlyData,
                type: type,
                year: 2026 
            });
        } else if (type === 'fuel') {
            const monthRaw = (cols[4] || '').trim().toUpperCase();
            const isMatch = MONTHS_ORDER.some(m => monthRaw.includes(m));
            if (!isMatch) return;
            results.push({
                id: `fuel-${idx}`,
                month: monthRaw,
                day: parseInt(cols[5]) || 1,
                year: parseInt(cols[6]) || 2026,
                tripTicket: cols[7] || '-',
                office: cols[8] || 'UNSPECIFIED',
                plateNumber: cols[9] || '-',
                amount: parseNumber(cols[10]), 
                unitCost: parseNumber(cols[11]),
                cost: parseNumber(cols[12]), 
                orNumber: cols[13] || '-',
                odometer: parseNumber(cols[14]),
                fuelType: cols[15] || '-',
                type: 'fuel'
            });
        }
    });
    return results;
  }, []);

  const fetchData = useCallback(async (type: string, manual = false) => {
    try {
      if (manual) setIsRefreshing(true);
      const url = sheetUrls[type as keyof typeof sheetUrls] || (DEFAULT_SHEETS as any)[type];
      if (!url) { if (manual) setIsRefreshing(false); return; }
      const exportUrl = getExportUrl(url);
      if (!exportUrl) { if (manual) setIsRefreshing(false); return; }
      const result = await fetchCsvData(exportUrl);
      if (result.error) throw new Error(result.error);
      const parsed = parseRecords(result.data!, type);
      setRecords(prev => ({ ...prev, [type]: parsed }));
      setLastSyncTime(new Date().toLocaleTimeString());
      if (manual) toast({ title: 'Sync Successful', description: `Latest ${type} data loaded.` });
    } catch (err: any) { if (manual) toast({ variant: 'destructive', title: 'Sync Failed', description: err.message }); }
    finally { if (manual) setIsRefreshing(false); }
  }, [getExportUrl, parseRecords, sheetUrls, toast]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all(['fuel', 'electricity', 'electricity_ledger', 'water_matrix', 'water_logs', 'vehicle_master'].map(t => fetchData(t)));
      setIsLoading(false);
    };
    init();
  }, [fetchData]);

  const currentTabParents = useMemo(() => {
    const names = new Set<string>();
    if (activeTab === 'electricity') {
      (records['electricity_ledger'] || []).forEach(r => {
        const val = (r.parentOffice || '').trim();
        const hasLetter = /[a-zA-Z]/.test(val);
        if (val && val.length > 1 && hasLetter) names.add(val);
      });
    } else {
      (records[activeTab === 'water' ? 'water_matrix' : activeTab] || []).forEach(r => {
        const val = (r.office || r.building || '').trim();
        if (val) names.add(val);
      });
    }
    return Array.from(names).sort();
  }, [activeTab, records]);

  const clearFilters = () => { setSelectedMonth('all'); setSelectedParent('all'); setSelectedSemester('all'); };

  const UtilityView = ({ type }: { type: 'electricity' | 'fuel' | 'water' }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [logsPage, setLogsPage] = useState(1);
    const [ledgerPage, setLedgerPage] = useState(1);

    const sourceKey = type === 'water' ? 'water_matrix' : type;
    const showS1 = selectedSemester === 'all' || selectedSemester === '1';
    const showS2 = selectedSemester === 'all' || selectedSemester === '2';

    const filteredData = useMemo(() => {
      const source = (records[sourceKey] || []);
      let processed = source.filter(r => {
          if (selectedParent === 'all') return true;
          // Use fuzzy matching for the collective matrix if acronym is provided
          const filterTerm = selectedParent.toLowerCase();
          const pOff = (r.parentOffice || '').toLowerCase();
          const bldg = (r.building || '').toLowerCase();
          const off = (r.office || '').toLowerCase();
          
          if (pOff === filterTerm) return true;
          if (bldg.includes(filterTerm)) return true;
          if (off.includes(filterTerm)) return true;
          
          return false;
      });
      
      if (type === 'electricity' && sourceKey === 'electricity') {
          const map = new Map<string, any>();
          processed.forEach(item => {
              const key = item.building;
              if (!map.has(key)) {
                  map.set(key, JSON.parse(JSON.stringify(item)));
              } else {
                  const existing = map.get(key);
                  MONTHS_ORDER.forEach(m => {
                      existing.monthly[m].energy += (item.monthly?.[m]?.energy || 0);
                      existing.monthly[m].amount += (item.monthly?.[m]?.amount || 0);
                  });
              }
          });
          processed = Array.from(map.values());
      }
      return processed;
    }, [records, sourceKey, selectedParent, type]);

    const filteredLogsData = useMemo(() => type === 'water' ? (records.water_logs || []).filter(r => selectedParent === 'all' || r.office === selectedParent || r.building === selectedParent) : [], [records, type, selectedParent]);
    const filteredLedgerData = useMemo(() => type === 'electricity' ? (records.electricity_ledger || []).filter(r => selectedParent === 'all' || r.parentOffice === selectedParent || r.office === selectedParent || r.building === selectedParent) : [], [records, type, selectedParent]);

    const unit = type === 'electricity' ? 'kWh' : type === 'water' ? 'Cu. M.' : 'L';

    const totals = useMemo(() => {
        let cost = 0, amount = 0;
        filteredData.forEach(r => {
            const months = selectedSemester === '1' ? S1_MONTHS : (selectedSemester === '2' ? S2_MONTHS : MONTHS_ORDER);
            months.forEach(m => {
                amount += (r.monthly?.[m]?.energy || 0);
                cost += (r.monthly?.[m]?.amount || 0);
            });
        });
        return { cost, amount };
    }, [filteredData, selectedSemester]);

    const chartData = useMemo(() => {
      const activeMonths = selectedSemester === '1' ? S1_MONTHS : (selectedSemester === '2' ? S2_MONTHS : MONTHS_ORDER);
      const chartSource = type === 'water' ? (records.water_logs || []) : (type === 'electricity' ? (records.electricity_ledger || []) : (records.fuel || []));
      const filtered = chartSource.filter(r => selectedParent === 'all' || r.parentOffice === selectedParent || r.office === selectedParent || r.building === selectedParent);

      return activeMonths.map(m => {
        const amount = filtered.reduce((s, r) => {
          if (type === 'fuel') return s + (r.month && r.month.toUpperCase().includes(m) ? (r.amount || 0) : 0);
          return s + (r.monthly?.[m]?.energy || 0);
        }, 0);
        return { month: m.substring(0,3), amount };
      });
    }, [records, type, selectedSemester, selectedParent]);

    const MatrixTable = ({ data, showDetails = false, showParent = false }: { data: any[], showDetails?: boolean, showParent?: boolean }) => (
        <Table className="text-[10px] border-collapse" style={{ minWidth: 800 }}>
            <TableHeader>
              <TableRow className="bg-[#1e293b] border-b border-[#334155] text-gray-300">
                <TableHead className="text-gray-300 font-bold border-r border-[#334155] sticky left-0 z-40 bg-[#1e293b] min-w-[250px] text-center" rowSpan={3}>OFFICE / FACILITY</TableHead>
                {showParent && <TableHead className="text-gray-300 font-bold border-r border-[#334155] sticky left-[250px] z-40 bg-[#1e293b] min-w-[180px] text-center" rowSpan={3}>PARENT OFFICE</TableHead>}
                {showDetails && <TableHead className={cn("text-gray-300 font-bold border-r border-[#334155] z-40 bg-[#1e293b] min-w-[150px] text-center", showParent ? "sticky left-[430px]" : "sticky left-[250px]")} rowSpan={3}>ACCOUNT NO.</TableHead>}
                {showS1 && <TableHead className="text-gray-300 font-bold border-r border-[#334155] text-center" colSpan={S1_MONTHS.length * 2 + 2}>FIRST SEMESTER 2026</TableHead>}
                {showS2 && <TableHead className="text-gray-300 font-bold border-r border-[#334155] text-center" colSpan={S2_MONTHS.length * 2 + 2}>SECOND SEMESTER 2026</TableHead>}
              </TableRow>
              <TableRow className="bg-[#1e293b] border-b border-[#334155]">
                 {showS1 && S1_MONTHS.map(m => <TableHead key={m} className="text-center text-gray-300 border-r border-[#334155]" colSpan={2}>{m}</TableHead>)}
                 {showS1 && <TableHead className="text-center text-accent bg-accent/10 border-r border-[#334155]" colSpan={2}>S1 TOTAL</TableHead>}
                 {showS2 && S2_MONTHS.map(m => <TableHead key={m} className="text-center text-gray-300 border-r border-[#334155]" colSpan={2}>{m}</TableHead>)}
                 {showS2 && <TableHead className="text-center text-accent bg-accent/10 border-r border-[#334155]" colSpan={2}>S2 TOTAL</TableHead>}
              </TableRow>
              <TableRow className="bg-[#1e293b] border-b border-[#334155]">
                 {Array.from({length: (showS1 ? 7 : 0) + (showS2 ? 7 : 0)}).map((_, i) => (
                    <Fragment key={i}>
                        <TableHead className="text-[8px] text-gray-400 border-r border-[#334155] text-center px-1">{unit}</TableHead>
                        <TableHead className="text-[8px] text-gray-400 border-r border-[#334155] text-center px-1">PHP</TableHead>
                    </Fragment>
                 ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length > 0 ? data.map((row, rIdx) => {
                const s1Qty = S1_MONTHS.reduce((s, m) => s + (row.monthly?.[m]?.energy || 0), 0);
                const s1Amt = S1_MONTHS.reduce((s, m) => s + (row.monthly?.[m]?.amount || 0), 0);
                const s2Qty = S2_MONTHS.reduce((s, m) => s + (row.monthly?.[m]?.energy || 0), 0);
                const s2Amt = S2_MONTHS.reduce((s, m) => s + (row.monthly?.[m]?.amount || 0), 0);
                return (
                  <TableRow key={rIdx} className="border-b border-[#1e293b] hover:bg-[#1e293b]/50 h-10">
                      <TableCell className="font-bold text-gray-200 border-r border-[#1e293b] sticky left-0 z-30 bg-[#0f172a] whitespace-nowrap uppercase truncate max-w-[250px]">{row.building}</TableCell>
                      {showParent && <TableCell className="text-gray-300 border-r border-[#1e293b] sticky left-[250px] z-30 bg-[#0f172a] uppercase text-[9px] truncate max-w-[180px]">{row.parentOffice}</TableCell>}
                      {showDetails && <TableCell className={cn("text-gray-400 border-r border-[#1e293b] z-30 bg-[#0f172a] font-mono", showParent ? "sticky left-[430px]" : "sticky left-[250px]")}>{row.accountNo}</TableCell>}
                      {showS1 && S1_MONTHS.map(m => (
                          <Fragment key={m}>
                              <TableCell className="text-right border-r border-[#1e293b]/30 text-gray-300">{row.monthly?.[m]?.energy?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '0.00'}</TableCell>
                              <TableCell className="text-right border-r border-[#1e293b] text-blue-300">₱{row.monthly?.[m]?.amount?.toLocaleString(undefined,{minimumFractionDigits:2}) || '0.00'}</TableCell>
                          </Fragment>
                      ))}
                      {showS1 && <><TableCell className="text-right border-r border-[#1e293b] bg-accent/5 text-accent font-bold">{s1Qty.toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell><TableCell className="text-right border-r border-[#1e293b] bg-accent/5 text-accent font-bold">₱{s1Amt.toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell></>}
                      {showS2 && S2_MONTHS.map(m => (
                          <Fragment key={m}>
                              <TableCell className="text-right border-r border-[#1e293b]/30 text-gray-300">{row.monthly?.[m]?.energy?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '0.00'}</TableCell>
                              <TableCell className="text-right border-r border-[#1e293b] text-blue-300">₱{row.monthly?.[m]?.amount?.toLocaleString(undefined,{minimumFractionDigits:2}) || '0.00'}</TableCell>
                          </Fragment>
                      ))}
                      {showS2 && <><TableCell className="text-right border-r border-[#1e293b] bg-accent/5 text-accent font-bold">{s2Qty.toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell><TableCell className="text-right border-r border-[#1e293b] bg-accent/5 text-accent font-bold">₱{s2Amt.toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell></>}
                  </TableRow>
                )
              }) : <TableRow><TableCell colSpan={40} className="text-center py-20 opacity-40"><AlertTriangle className="h-8 w-8 mx-auto mb-2"/><p>No data found.</p></TableCell></TableRow>}
            </TableBody>
        </Table>
    );

    return (
        <div className="space-y-6 w-full max-w-full overflow-hidden pb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card><CardHeader className="pb-2"><CardDescription>Total Cost ({selectedSemester === 'all' ? '2026' : `S${selectedSemester}`})</CardDescription><CardTitle className="text-2xl font-bold">₱{totals.cost.toLocaleString(undefined,{minimumFractionDigits:2})}</CardTitle></CardHeader></Card>
                <Card><CardHeader className="pb-2"><CardDescription>Total {unit} ({selectedSemester === 'all' ? '2026' : `S${selectedSemester}`})</CardDescription><CardTitle className="text-2xl font-bold">{totals.amount.toLocaleString()} {unit}</CardTitle></CardHeader></Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-lg flex items-center gap-2 font-headline"><TrendingUp className="h-5 w-5 text-primary"/> Trends</CardTitle></CardHeader><CardContent className="h-[250px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid vertical={false} strokeDasharray="3 3"/><XAxis dataKey="month"/><YAxis/><Tooltip/><Line name={unit} type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2}/></LineChart></ResponsiveContainer></CardContent></Card>
              <TrendComparison data={chartData} unit={unit} />
            </div>
            <div className="space-y-8">
                {type === 'water' && (
                    <Card className="bg-[#0f172a] text-white border-none shadow-xl">
                        <CardHeader><CardTitle className="text-lg flex items-center gap-2 font-headline"><History className="h-5 w-5 text-blue-400"/> LOG HISTORY</CardTitle></CardHeader>
                        <CardContent className="p-0 overflow-x-auto"><MatrixTable data={filteredLogsData.slice((logsPage-1)*20, logsPage*20)} showDetails/></CardContent>
                        <CardFooter className="justify-between border-t border-[#1e293b] py-4">
                            <span className="text-xs text-gray-400">Page {logsPage} of {Math.ceil(filteredLogsData.length / 20)}</span>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={()=>setLogsPage(p=>p-1)} disabled={logsPage===1}>Prev</Button>
                                <Input type="number" min={1} max={Math.ceil(filteredLogsData.length/20)} className="w-12 h-8 text-center bg-[#1e293b] border-[#334155]" value={logsPage} onChange={e=>setLogsPage(Number(e.target.value)||1)} />
                                <Button variant="ghost" size="sm" onClick={()=>setLogsPage(p=>p+1)} disabled={filteredLogsData.length <= logsPage*20}>Next</Button>
                            </div>
                        </CardFooter>
                    </Card>
                )}
                {type === 'electricity' && (
                    <Card className="bg-[#0f172a] text-white border-none shadow-xl">
                        <CardHeader><CardTitle className="text-lg flex items-center gap-2 font-headline"><LayoutList className="h-5 w-5 text-accent"/> TRANSACTION LEDGER</CardTitle></CardHeader>
                        <CardContent className="p-0 overflow-x-auto"><MatrixTable data={filteredLedgerData.slice((ledgerPage-1)*20, ledgerPage*20)} showDetails showParent/></CardContent>
                        <CardFooter className="justify-between border-t border-[#1e293b] py-4">
                            <span className="text-xs text-gray-400">Page {ledgerPage} of {Math.ceil(filteredLedgerData.length / 20)}</span>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={()=>setLedgerPage(p=>p-1)} disabled={ledgerPage===1}>Prev</Button>
                                <Input type="number" min={1} max={Math.ceil(filteredLedgerData.length/20)} className="w-12 h-8 text-center bg-[#1e293b] border-[#334155]" value={ledgerPage} onChange={e=>setLedgerPage(Number(e.target.value)||1)} />
                                <Button variant="ghost" size="sm" onClick={()=>setLedgerPage(p=>p+1)} disabled={filteredLedgerData.length <= ledgerPage*20}>Next</Button>
                            </div>
                        </CardFooter>
                    </Card>
                )}
                <Card className="bg-[#0f172a] text-white border-none shadow-xl">
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2 font-headline"><History className="h-5 w-5 text-blue-400"/> COLLECTIVE MATRIX</CardTitle></CardHeader>
                    <CardContent className="p-0 overflow-x-auto"><MatrixTable data={filteredData.slice((currentPage-1)*20, currentPage*20)} showDetails={type==='electricity'}/></CardContent>
                    <CardFooter className="justify-between border-t border-[#1e293b] py-4">
                        <span className="text-xs text-gray-400">Page {currentPage} of {Math.ceil(filteredData.length / 20)}</span>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={()=>setCurrentPage(p=>p-1)} disabled={currentPage===1}>Prev</Button>
                            <Input type="number" min={1} max={Math.ceil(filteredData.length/20)} className="w-12 h-8 text-center bg-[#1e293b] border-[#334155]" value={currentPage} onChange={e=>setCurrentPage(Number(e.target.value)||1)} />
                            <Button variant="ghost" size="sm" onClick={()=>setCurrentPage(p=>p+1)} disabled={filteredData.length <= currentPage*20}>Next</Button>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
  };

  const FuelView = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const [rankingsPage, setRankingsPage] = useState(1);
    const [officeCompPage, setOfficeCompPage] = useState(1);
    const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
    const [isVehiclePopoverOpen, setIsVehiclePopoverOpen] = useState(false);
    
    // Comparison Ranking State
    const [monthA, setMonthA] = useState('JANUARY');
    const [monthB, setMonthB] = useState('FEBRUARY');

    const filteredRecords = useMemo(() => {
        let data = (records.fuel || []);
        
        if (selectedParent !== 'all') {
            data = data.filter(r => r.office === selectedParent);
        }
        
        if (selectedMonth !== 'all') {
            data = data.filter(r => (r.month?.toUpperCase() || '').includes(selectedMonth.toUpperCase()));
        }

        if (selectedSemester === '1') {
            data = data.filter(r => S1_MONTHS.some(m => (r.month?.toUpperCase() || '').includes(m)));
        } else if (selectedSemester === '2') {
            data = data.filter(r => S2_MONTHS.some(m => (r.month?.toUpperCase() || '').includes(m)));
        }
        
        return data;
    }, [records.fuel, selectedParent, selectedSemester, selectedMonth]);
    
    const availablePlates = useMemo(() => {
        const plates = new Set<string>();
        (records.fuel || []).forEach(r => { if (r.plateNumber && r.plateNumber !== '-') plates.add(r.plateNumber); });
        return Array.from(plates).sort();
    }, [records.fuel]);

    const vehicleRankings = useMemo(() => {
        const map = new Map<string, { plate: string, office: string, liters: number, cost: number }>();
        filteredRecords.forEach(r => {
            const plate = r.plateNumber || '-';
            if (!map.has(plate)) {
                map.set(plate, { plate, office: r.office, liters: 0, cost: 0 });
            }
            const entry = map.get(plate)!;
            entry.liters += (r.amount || 0);
            entry.cost += (r.cost || 0);
        });
        return Array.from(map.values()).sort((a, b) => b.liters - a.liters);
    }, [filteredRecords]);

    const officeComparisonRankings = useMemo(() => {
        const fuelSource = (records.fuel || []);
        const semesterConstraint = selectedSemester === '1' ? S1_MONTHS : (selectedSemester === '2' ? S2_MONTHS : MONTHS_ORDER);
        
        const offices = Array.from(new Set(fuelSource.map(r => r.office))).sort();
        
        const results = offices.map(off => {
            const officeRecs = fuelSource.filter(r => r.office === off);
            const qtyA = officeRecs.reduce((s, r) => r.month?.toUpperCase().includes(monthA) ? s + (r.amount || 0) : s, 0);
            const qtyB = officeRecs.reduce((s, r) => r.month?.toUpperCase().includes(monthB) ? s + (r.amount || 0) : s, 0);
            const change = qtyA === 0 ? (qtyB > 0 ? 100 : 0) : ((qtyB - qtyA) / qtyA) * 100;
            return { office: off, qtyA, qtyB, change };
        });

        return results.sort((a, b) => b.change - a.change);
    }, [records.fuel, monthA, monthB, selectedSemester]);

    const chartData = useMemo(() => {
        const activeMonths = selectedSemester === '1' ? S1_MONTHS : (selectedSemester === '2' ? S2_MONTHS : MONTHS_ORDER);
        return activeMonths.map(m => ({
            month: m.substring(0,3), 
            amount: filteredRecords.reduce((s, r) => r.month?.toUpperCase().includes(m) ? s + (r.amount || 0) : s, 0) 
        }));
    }, [filteredRecords, selectedSemester]);
    
    const vehicleChartData = useMemo(() => {
        if (!selectedVehicle) return [];
        const activeMonths = selectedSemester === '1' ? S1_MONTHS : (selectedSemester === '2' ? S2_MONTHS : MONTHS_ORDER);
        const vehicleRecords = filteredRecords.filter(r => r.plateNumber === selectedVehicle);
        return activeMonths.map(m => ({ 
            month: m.substring(0,3), 
            amount: vehicleRecords.reduce((s, r) => r.month?.toUpperCase().includes(m) ? s + (r.amount || 0) : s, 0) 
        }));
    }, [filteredRecords, selectedVehicle, selectedSemester]);

    const totalPagesLogs = Math.ceil(filteredRecords.length / 10);
    const totalPagesRankings = Math.ceil(vehicleRankings.length / 10);
    const totalPagesOfficeComp = Math.ceil(officeComparisonRankings.length / 10);

    return (
        <div className="space-y-6 w-full max-w-full overflow-hidden pb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card><CardHeader className="pb-2"><CardDescription>Total Fuel Cost</CardDescription><CardTitle className="text-2xl font-bold">₱{filteredRecords.reduce((s,r)=>s+(r.cost||0),0).toLocaleString(undefined,{minimumFractionDigits:2})}</CardTitle></CardHeader></Card>
                <Card><CardHeader className="pb-2"><CardDescription>Total Liters</CardDescription><CardTitle className="text-2xl font-bold">{filteredRecords.reduce((s,r)=>s+(r.amount||0),0).toLocaleString()} L</CardTitle></CardHeader></Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-lg flex items-center gap-2 font-headline"><TrendingUp className="h-5 w-5 text-primary"/> Overall Fuel Trends</CardTitle></CardHeader><CardContent className="h-[250px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid vertical={false} strokeDasharray="3 3"/><XAxis dataKey="month"/><YAxis/><Tooltip/><Line name="Liters" type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2}/></LineChart></ResponsiveContainer></CardContent></Card>
              <TrendComparison data={chartData} unit="L" />
            </div>

            <Card className="bg-[#1e293b]/10 border-dashed border-[#334155]">
                <CardHeader>
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <CardTitle className="text-lg font-headline flex items-center gap-2"><Car className="h-5 w-5 text-accent"/> Vehicle Performance</CardTitle>
                        <Popover open={isVehiclePopoverOpen} onOpenChange={setIsVehiclePopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-[250px] justify-between h-9 text-xs">
                                    {selectedVehicle ? selectedVehicle : "Search Vehicle..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[250px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search plate..." />
                                    <CommandList>
                                        <CommandEmpty>No vehicle found.</CommandEmpty>
                                        <CommandGroup>
                                            {availablePlates.map((plate) => (
                                                <CommandItem key={plate} value={plate} onSelect={(v) => { setSelectedVehicle(v); setIsVehiclePopoverOpen(false); }}>
                                                    <Check className={cn("mr-2 h-4 w-4", selectedVehicle === plate ? "opacity-100" : "opacity-0")} />
                                                    {plate}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardHeader>
                <CardContent>
                    {!selectedVehicle ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-50"><SearchIcon className="h-10 w-10 mb-2"/><p>Search for a plate number to view performance data.</p></div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                             <Card className="lg:col-span-2 bg-[#0f172a] border-[#334155]"><CardHeader><CardTitle className="text-sm font-medium">Consumption Trend: {selectedVehicle}</CardTitle></CardHeader><CardContent className="h-[250px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={vehicleChartData}><CartesianGrid vertical={false} strokeDasharray="3 3"/><XAxis dataKey="month"/><YAxis/><Tooltip/><Line name="Liters" type="monotone" dataKey="amount" stroke="hsl(var(--accent))" strokeWidth={2}/></LineChart></ResponsiveContainer></CardContent></Card>
                             <TrendComparison data={vehicleChartData} unit="L" />
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card className="bg-[#0f172a] text-white border-none shadow-xl">
                    <CardHeader>
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2 font-headline"><Percent className="h-5 w-5 text-accent"/> OFFICE COMPARISON RANKING</CardTitle>
                                <CardDescription className="text-gray-400">Offices ranked by percentage change between selected months.</CardDescription>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            <div className="space-y-1">
                                <Label className="text-[10px] text-gray-500 uppercase font-bold">Month A</Label>
                                <Select value={monthA} onValueChange={setMonthA}>
                                    <SelectTrigger className="h-8 bg-[#1e293b] border-[#334155] text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>{MONTHS_ORDER.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-gray-500 uppercase font-bold">Month B</Label>
                                <Select value={monthB} onValueChange={setMonthB}>
                                    <SelectTrigger className="h-8 bg-[#1e293b] border-[#334155] text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>{MONTHS_ORDER.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table className="text-[10px]">
                            <TableHeader>
                                <TableRow className="bg-[#1e293b] border-b border-[#334155] text-gray-300">
                                    <TableHead>OFFICE</TableHead>
                                    <TableHead className="text-right">{monthA.substring(0,3)} (L)</TableHead>
                                    <TableHead className="text-right">{monthB.substring(0,3)} (L)</TableHead>
                                    <TableHead className="text-right">% CHANGE</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {officeComparisonRankings.slice((officeCompPage-1)*10, officeCompPage*10).map((r, idx) => (
                                    <TableRow key={r.office} className="border-b border-[#1e293b] hover:bg-[#1e293b]/50 h-10">
                                        <TableCell className="font-bold text-gray-300">{r.office}</TableCell>
                                        <TableCell className="text-right text-gray-400">{r.qtyA.toLocaleString()}</TableCell>
                                        <TableCell className="text-right text-gray-200">{r.qtyB.toLocaleString()}</TableCell>
                                        <TableCell className={cn("text-right font-bold", r.change > 0 ? "text-red-500" : r.change < 0 ? "text-green-500" : "text-gray-400")}>
                                            {r.change > 0 ? '+' : ''}{r.change.toFixed(1)}%
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter className="justify-between border-t border-[#1e293b] py-4">
                        <span className="text-xs text-gray-400">Page {officeCompPage} of {totalPagesOfficeComp}</span>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={()=>setOfficeCompPage(p=>Math.max(1,p-1))} disabled={officeCompPage===1}>Prev</Button>
                            <Input type="number" min={1} max={totalPagesOfficeComp} className="w-12 h-8 text-center bg-[#1e293b] border-[#334155]" value={officeCompPage} onChange={e=>{const v=parseInt(e.target.value); if(v>=1 && v<=totalPagesOfficeComp) setOfficeCompPage(v);}} />
                            <Button variant="ghost" size="sm" onClick={()=>setOfficeCompPage(p=>Math.min(totalPagesOfficeComp,p+1))} disabled={officeCompPage >= totalPagesOfficeComp}>Next</Button>
                        </div>
                    </CardFooter>
                </Card>

                <Card className="bg-[#0f172a] text-white border-none shadow-xl">
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2 font-headline"><Trophy className="h-5 w-5 text-yellow-400"/> COLLECTIVE VEHICLE RANKINGS</CardTitle><CardDescription className="text-gray-400">Unique plate numbers listed by highest liters consumed.</CardDescription></CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table className="text-[10px]">
                            <TableHeader>
                                <TableRow className="bg-[#1e293b] border-b border-[#334155] text-gray-300">
                                    <TableHead className="w-12">RANK</TableHead>
                                    <TableHead>PLATE NO.</TableHead>
                                    <TableHead>PRIMARY OFFICE</TableHead>
                                    <TableHead className="text-right">TOTAL LITERS</TableHead>
                                    <TableHead className="text-right">TOTAL COST</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {vehicleRankings.slice((rankingsPage-1)*10, rankingsPage*10).map((r, idx) => (
                                    <TableRow key={r.plate} className="border-b border-[#1e293b] hover:bg-[#1e293b]/50 h-10">
                                        <TableCell className="font-bold text-gray-400">#{(rankingsPage-1)*10 + idx + 1}</TableCell>
                                        <TableCell className="font-bold text-accent">{r.plate}</TableCell>
                                        <TableCell className="text-gray-300">{r.office}</TableCell>
                                        <TableCell className="text-right font-mono">{r.liters.toLocaleString(undefined, {minimumFractionDigits:2})} L</TableCell>
                                        <TableCell className="text-right text-blue-300">₱{r.cost.toLocaleString(undefined, {minimumFractionDigits:2})}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter className="justify-between border-t border-[#1e293b] py-4">
                        <span className="text-xs text-gray-400">Page {rankingsPage} of {totalPagesRankings}</span>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={()=>setRankingsPage(p=>Math.max(1,p-1))} disabled={rankingsPage===1}>Prev</Button>
                            <Input type="number" min={1} max={totalPagesRankings} className="w-12 h-8 text-center bg-[#1e293b] border-[#334155]" value={rankingsPage} onChange={e=>{const v=parseInt(e.target.value); if(v>=1 && v<=totalPagesRankings) setRankingsPage(v);}} />
                            <Button variant="ghost" size="sm" onClick={()=>setRankingsPage(p=>Math.min(totalPagesRankings,p+1))} disabled={rankingsPage >= totalPagesRankings}>Next</Button>
                        </div>
                    </CardFooter>
                </Card>
            </div>

            <Card className="bg-[#0f172a] text-white border-none shadow-xl">
                <CardHeader><CardTitle className="text-lg font-headline">FUEL LOGS</CardTitle></CardHeader>
                <CardContent className="p-0 overflow-x-auto"><Table className="text-[10px]"><TableHeader><TableRow className="bg-[#1e293b] border-b border-[#334155] text-gray-300"><TableHead>MONTH</TableHead><TableHead>DAY</TableHead><TableHead>OFFICE</TableHead><TableHead>PLATE</TableHead><TableHead className="text-right">LITERS</TableHead><TableHead className="text-right">COST</TableHead></TableRow></TableHeader><TableBody>{filteredRecords.slice((currentPage-1)*10, currentPage*10).map((r,idx)=>(<TableRow key={idx} className="border-b border-[#1e293b] h-10"><TableCell className="font-bold">{r.month}</TableCell><TableCell>{r.day}</TableCell><TableCell>{r.office}</TableCell><TableCell className="font-mono">{r.plateNumber}</TableCell><TableCell className="text-right">{r.amount}</TableCell><TableCell className="text-right text-blue-300">₱{r.cost}</TableCell></TableRow>))}</TableBody></Table></CardContent>
                <CardFooter className="justify-between border-t border-[#1e293b] py-4">
                    <span className="text-xs text-gray-400">Page {currentPage} of {totalPagesLogs}</span>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={()=>setCurrentPage(p=>Math.max(1, p-1))} disabled={currentPage===1}>Prev</Button>
                        <Input type="number" min={1} max={totalPagesLogs} className="w-12 h-8 text-center bg-[#1e293b] border-[#334155]" value={currentPage} onChange={e=>{const v=parseInt(e.target.value); if(v>=1 && v<=totalPagesLogs) setCurrentPage(v);}} />
                        <Button variant="ghost" size="sm" onClick={()=>setCurrentPage(p=>Math.min(totalPagesLogs, p+1))} disabled={currentPage >= totalPagesLogs}>Next</Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
  };

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 md:p-8 max-w-full overflow-hidden">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex flex-col gap-1"><h1 className="text-3xl font-bold font-headline flex items-center gap-2"><LineChartIcon className="text-primary h-8 w-8" /> Consumption</h1>{lastSyncTime && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-accent"/> Last synced at {lastSyncTime}</p>}</div>
        <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setIsHelpOpen(true)} className="gap-2"><HelpCircle className="h-4 w-4" /> Link Guide</Button><Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)} className="gap-2"><Settings2 className="h-4 w-4" /> Settings</Button><Button size="sm" onClick={() => fetchData(activeTab === 'water' ? 'water_matrix' : activeTab, true)} disabled={isRefreshing} className="gap-2"><RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} /> Sync Tab</Button></div>
      </div>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-muted-foreground">Syncing data from Google Sheets...</p></div>
      ) : (
        <Tabs defaultValue="fuel" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <TabsList className="grid grid-cols-3 w-full lg:w-[360px]"><TabsTrigger value="fuel">Fuel</TabsTrigger><TabsTrigger value="electricity">Electric</TabsTrigger><TabsTrigger value="water">Water</TabsTrigger></TabsList>
            <div className="flex flex-wrap w-full lg:w-auto gap-2">
                <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                    <SelectTrigger className="w-full lg:w-[150px] h-9 gap-2"><CalendarDays className="h-4 w-4 text-muted-foreground" /><SelectValue placeholder="Semester" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Full Year (2026)</SelectItem><SelectItem value="1">1st Semester</SelectItem><SelectItem value="2">2nd Semester</SelectItem></SelectContent>
                </Select>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-full lg:w-[130px] h-9"><SelectValue placeholder="Month" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Months</SelectItem>{MONTHS_ORDER.map(m=>(<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent>
                </Select>
                <Select value={selectedParent} onValueChange={setSelectedParent}>
                    <SelectTrigger className="w-full lg:w-[220px] h-9"><SelectValue placeholder="Office" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Offices</SelectItem>{currentTabParents.map(o=>(<SelectItem key={o} value={o}>{o}</SelectItem>))}</SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary" onClick={clearFilters} title="Clear Filters"><FilterX className="h-4 w-4"/></Button>
            </div>
          </div>
          <TabsContent value="fuel" className="m-0"><FuelView /></TabsContent>
          <TabsContent value="electricity" className="m-0"><UtilityView type="electricity" /></TabsContent>
          <TabsContent value="water" className="m-0"><UtilityView type="water" /></TabsContent>
        </Tabs>
      )}
      
      {/* Settings Modal */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Source Settings</DialogTitle>
            <DialogDescription>Paste your Google Sheet URLs to fetch consumption data.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Fuel Sheet URL</Label>
              <Input value={sheetUrls.fuel} onChange={e=>{setSheetUrls(s=>({...s, fuel: e.target.value})); localStorage.setItem('consumption_url_fuel', e.target.value)}} />
            </div>
            <div className="grid gap-2">
              <Label>Vehicle Master Sheet URL</Label>
              <Input value={sheetUrls.vehicle_master} onChange={e=>{setSheetUrls(s=>({...s, vehicle_master: e.target.value})); localStorage.setItem('consumption_url_vehicle_master', e.target.value)}} />
            </div>
            <div className="grid gap-2">
              <Label>Electricity Matrix Sheet URL</Label>
              <Input value={sheetUrls.electricity} onChange={e=>{setSheetUrls(s=>({...s, electricity: e.target.value})); localStorage.setItem('consumption_url_electricity', e.target.value)}} />
            </div>
            <div className="grid gap-2">
              <Label>Electricity Ledger Sheet URL</Label>
              <Input value={sheetUrls.electricity_ledger} onChange={e=>{setSheetUrls(s=>({...s, electricity_ledger: e.target.value})); localStorage.setItem('consumption_url_electricity_ledger', e.target.value)}} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={()=>setIsSettingsOpen(false)}>Save & Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guide Modal */}
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Google Sheets Sync Guide</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p>1. Open your Google Sheet.</p>
            <p>2. Click <strong>Share</strong> and set to <strong>"Anyone with the link"</strong> as Viewer.</p>
            <p>3. Copy the URL from your browser address bar.</p>
            <p>4. Paste it into the Settings here. Ensure the GID (tab ID) is correct.</p>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>The system fetches data via server-side CSV export. Ensure column headers match the expected matrix format.</AlertDescription>
            </Alert>
          </div>
          <DialogFooter><Button onClick={()=>setIsHelpOpen(false)}>Got it</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
