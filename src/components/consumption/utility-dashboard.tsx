'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { 
  Loader2, 
  History, 
  TrendingUp, 
  ReceiptText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { UtilityRecord } from '@/lib/types';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const MONTHS_ORDER = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

interface UtilityDashboardProps {
  type: 'fuel' | 'water' | 'electricity';
  title: string;
  icon: React.ElementType;
}

export default function UtilityDashboard({ type, title, icon: Icon }: UtilityDashboardProps) {
  const [selectedOffice, setSelectedOffice] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const { isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const utilitiesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'utilities'),
      where('type', '==', type),
      orderBy('date', 'desc')
    );
  }, [firestore, type]);

  const { data: records, isLoading: isDataLoading } = useCollection<UtilityRecord>(utilitiesQuery);

  const unit = type === 'fuel' ? 'L' : type === 'water' ? 'm³' : 'kWh';

  const chartData = useMemo(() => {
    const monthlyData: Record<string, { month: string; amount: number; order: number }> = {};
    
    // Initialize full year starting from January
    MONTHS_ORDER.forEach((m, index) => {
      monthlyData[m] = { month: m.substring(0, 3), amount: 0, order: index };
    });

    if (records) {
      records.filter(r => selectedOffice === 'all' || (r.office && r.office === selectedOffice)).forEach(r => {
        const mKey = (r.month || '').toUpperCase();
        if (monthlyData[mKey]) {
          monthlyData[mKey].amount += (r.amount || 0);
        }
      });
    }

    return Object.values(monthlyData).sort((a, b) => a.order - b.order);
  }, [records, selectedOffice]);

  const uniqueOffices = useMemo(() => {
    if (!records) return [];
    return Array.from(new Set(records.map(r => r.office).filter(o => o && o.trim() !== ''))).sort();
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records?.filter(r => selectedOffice === 'all' || (r.office && r.office === selectedOffice)) || [];
  }, [records, selectedOffice]);

  // Aggregate by Office Name for the simplified table
  const aggregatedByOffice = useMemo(() => {
    const summary: Record<string, { office: string; totalQty: number; totalCost: number }> = {};
    filteredRecords.forEach(r => {
      const o = r.office || 'N/A';
      if (!summary[o]) summary[o] = { office: o, totalQty: 0, totalCost: 0 };
      summary[o].totalQty += (r.amount || 0);
      summary[o].totalCost += (r.cost || 0);
    });
    return Object.values(summary).sort((a, b) => b.totalQty - a.totalQty);
  }, [filteredRecords]);

  const totalCost = filteredRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
  const totalAmount = filteredRecords.reduce((sum, r) => sum + (r.amount || 0), 0);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAggregatedData = aggregatedByOffice.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(aggregatedByOffice.length / itemsPerPage);

  if (isUserLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold font-headline flex items-center gap-3">
            <Icon className="text-primary h-8 w-8" /> 
            {title} Consumption
          </h1>
          <p className="text-muted-foreground">Monitor volume and review historical logs for {title.toLowerCase()}.</p>
        </div>
        
        <div className="w-full sm:w-[250px]">
          <Select value={selectedOffice} onValueChange={(v) => { setSelectedOffice(v); setCurrentPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Office" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Offices</SelectItem>
              {uniqueOffices.map(office => (
                <SelectItem key={office} value={office}>{office}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold text-muted-foreground">Total Cost (Filtered)</CardDescription>
            <CardTitle className="text-2xl font-bold">
              ₱{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold text-muted-foreground">Total Qty (Filtered)</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {unit}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-headline flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> 
            Usage Trends
          </CardTitle>
          <CardDescription>Full year consumption starting from January</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 'auto']} tickFormatter={(val) => `${val.toLocaleString()} ${unit}`} />
              <Tooltip formatter={(value: number) => [`${value.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${unit}`, 'Amount']} />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2} 
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-[#0f172a] text-white border-none shadow-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2 font-headline">
            <History className="h-5 w-5 text-blue-400" /> Office Consumption Totals
          </CardTitle>
          <CardDescription className="text-gray-400">Aggregated totals per office for {type} ({itemsPerPage} per page).</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="text-[11px]">
            <TableHeader>
              <TableRow className="bg-[#1e293b] border-b border-[#334155] text-gray-300">
                <TableHead className="text-gray-300 font-bold">OFFICE / RESPONSIBILITY CENTER</TableHead>
                <TableHead className="text-gray-300 font-bold text-right">TOTAL QUANTITY ({unit})</TableHead>
                <TableHead className="text-gray-300 font-bold text-right">TOTAL COST (PHP)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAggregatedData.length > 0 ? (
                paginatedAggregatedData.map(row => (
                  <TableRow key={row.office} className="border-b border-[#1e293b] hover:bg-[#1e293b]/50">
                    <TableCell className="font-bold text-gray-200">{row.office}</TableCell>
                    <TableCell className="text-right text-gray-200">{row.totalQty.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-bold text-gray-200">₱{row.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                    <ReceiptText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    No records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-between items-center py-4 px-6 border-t border-[#1e293b] bg-[#0f172a]">
            <span className="text-xs text-gray-400">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, aggregatedByOffice.length)} of {aggregatedByOffice.length} offices
            </span>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} 
                disabled={currentPage===1}
                className="text-gray-400 hover:text-white hover:bg-[#1e293b]"
              >
                <ChevronLeft className="h-4 w-4 mr-1"/> Previous
              </Button>
              
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400">Go to:</span>
                <Input
                  type="number"
                  className="w-12 h-8 bg-[#1e293b] border-[#334155] text-white text-center text-xs p-1 focus:ring-blue-500"
                  value={currentPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (val >= 1 && val <= totalPages) setCurrentPage(val);
                  }}
                />
                <span className="text-gray-400">of {totalPages}</span>
              </div>

              <Button 
                variant="ghost" 
                size="sm" 
                onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} 
                disabled={currentPage===totalPages || totalPages === 0}
                className="text-gray-400 hover:text-white hover:bg-[#1e293b]"
              >
                Next <ChevronRight className="h-4 w-4 ml-1"/>
              </Button>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}