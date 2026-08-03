

'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { InventoryItem } from '@/lib/types';
import { getYear, parse, isValid } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Loader2, Maximize } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { responsibilityCenters, responsibilityCenterAcronyms, icsAccountCodes, parAccountCodes } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';

const safeParseDate = (dateInput: any): Date | null => {
    if (!dateInput) return null;

    if (dateInput?.toDate && typeof dateInput.toDate === 'function') {
        return dateInput.toDate();
    }
    
    if (dateInput instanceof Timestamp) {
        return dateInput.toDate();
    }
    
    if (typeof dateInput === 'string') {
        const parsed = parse(dateInput, 'MM/dd/yyyy', new Date());
        return isValid(parsed) ? parsed : null;
    }
    
    return null;
};

const getUniqueArticles = (items: InventoryItem[]): string[] => {
    const articles = items
        .map(item => item.article)
        .filter(Boolean)
        .map(article => {
            let cleaned = article.trim();
            if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
                cleaned = cleaned.substring(1, cleaned.length - 1).trim();
            }
            return cleaned;
        })
        .filter(Boolean);

    const uniqueArticlesMap = new Map<string, string>();
    articles.forEach(article => {
        const lowerCaseArticle = article.toLowerCase();
        if (!uniqueArticlesMap.has(lowerCaseArticle)) {
            uniqueArticlesMap.set(lowerCaseArticle, article);
        }
    });

    return [...uniqueArticlesMap.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
};

const getUniqueYears = (items: InventoryItem[]): number[] => {
    return [...new Set(items.map(item => {
        const acqDate = safeParseDate(item.acquisition_date);
        return acqDate && isValid(acqDate) ? getYear(acqDate) : null;
    }).filter((year): year is number => year !== null))].sort((a, b) => b - a);
};

const renderChart = (data: any[], config: any, xAxisDataKey: string, minWidth: number = 0) => (
    <ChartContainer config={config} className="w-full h-full p-4" style={{ minWidth: minWidth > 0 ? minWidth : '100%' }}>
        <BarChart accessibilityLayer data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid vertical={false} />
            <XAxis
                dataKey={xAxisDataKey}
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => {
                    if (typeof value === 'string') {
                        if (xAxisDataKey === 'name' || xAxisDataKey === 'year') {
                            return value;
                        }
                    }
                    return value;
                }}
                interval={0}
            />
            <YAxis domain={[0, 'dataMax + 10']} />
            <ChartTooltip
                cursor={false}
                content={
                    <ChartTooltipContent
                        indicator="dot"
                        labelFormatter={(label, payload) => {
                            if (!payload || payload.length === 0) return label;
                            const item = payload[0].payload;
                            if (xAxisDataKey === 'name') return item.fullName;
                            if (xAxisDataKey === 'year') return `Year: ${item.year}`;
                            return label;
                        }}
                    />
                }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="ics" name="ICS" fill="var(--color-ics)" radius={4} />
            <Bar dataKey="par" name="PAR" fill="var(--color-par)" radius={4} />
        </BarChart>
    </ChartContainer>
);

const ChartCard = ({ cardTitle, cardDescription, data, config, isLoading, xAxisDataKey, scrollable = false, children }: { cardTitle: string, cardDescription: string, data: any[], config: any, isLoading: boolean, xAxisDataKey: string, scrollable?: boolean, children?: React.ReactNode }) => {
    const chartMinWidth = scrollable && data.length > 10 ? data.length * 60 : 0;

    const chartComponent = isLoading ? <Skeleton className="h-[250px] w-full" /> : renderChart(data, config, xAxisDataKey, chartMinWidth);
    const fullscreenChartComponent = isLoading ? <Skeleton className="h-full w-full" /> : renderChart(data, config, xAxisDataKey, chartMinWidth);


    return (
      <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex-1">
                  <CardTitle>{cardTitle}</CardTitle>
                  <CardDescription>{cardDescription}</CardDescription>
              </div>
              <div className="flex items-center justify-end flex-wrap gap-2">
                {children}
                <Dialog>
                      <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                              <Maximize className="h-4 w-4" />
                          </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[90vw] w-full h-[90vh] flex flex-col p-4">
                          <DialogHeader className="flex-row items-center justify-between">
                              <DialogTitle>{cardTitle}</DialogTitle>
                              {children && <div className="flex items-center gap-2 pr-6">{children}</div>}
                          </DialogHeader>
                           <div className="flex-grow min-h-0">
                            <ScrollArea className="h-full w-full">
                                {fullscreenChartComponent}
                            </ScrollArea>
                          </div>
                      </DialogContent>
                  </Dialog>
              </div>
          </CardHeader>
          <CardContent className="h-[300px]">
              {scrollable ? (
                <ScrollArea className="w-full whitespace-nowrap h-full">
                  {chartComponent}
                </ScrollArea>
              ) : chartComponent}
          </CardContent>
      </Card>
    );
};

export default function DocumentTrackingClient() {
  const firestore = useFirestore();
  const [selectedCenter, setSelectedCenter] = useState('all');
  const [selectedAccountCode, setSelectedAccountCode] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  
  const [cityYearlyAcquisitionsFilter, setCityYearlyAcquisitionsFilter] = useState('all');
  const [cityYearlyArticleFilter, setCityYearlyArticleFilter] = useState('all');
  
  const [nationalYearlyAcquisitionsFilter, setNationalYearlyAcquisitionsFilter] = useState('all');
  const [nationalYearlyArticleFilter, setNationalYearlyArticleFilter] = useState('all');

  const [centerArticleFilter, setCenterArticleFilter] = useState('all');
  const [centerYearFilter, setCenterYearFilter] = useState('all');
  const [officeCategoryFilter, setOfficeCategoryFilter] = useState('City Offices');


  const inventoryQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'inventory'));
  }, [firestore]);

  const { data: allItems, isLoading } = useCollection<InventoryItem>(inventoryQuery);
  
    const {
        uniqueResponsibilityCenters,
        uniqueAccountCodes,
        uniqueArticles,
        uniqueYears,
        customQueryCount,
        customQueryValue,
        cityOffices,
        nationalOffices,
        centerChartArticles,
        centerChartYears,
        cityChartArticles,
        nationalChartArticles,
    } = useMemo(() => {
        if (!allItems) {
            return {
                uniqueResponsibilityCenters: [],
                uniqueAccountCodes: [],
                uniqueArticles: [],
                uniqueYears: [],
                customQueryCount: 0,
                customQueryValue: 0,
                cityOffices: [],
                nationalOffices: [],
                centerChartArticles: [],
                centerChartYears: [],
                cityChartArticles: [],
                nationalChartArticles: [],
            };
        }

        // --- Logic for Custom Query Filters (top section) ---
        const allResponsibilityCenters = responsibilityCenters.map(rc => rc.name).sort();

        const centerFilteredItems = selectedCenter === 'all' ?
            allItems :
            allItems.filter(item => item.responsibility_center === selectedCenter);

        const allAccountCodes = [...icsAccountCodes, ...parAccountCodes];
        const availableAccountCodes = [...new Set(centerFilteredItems.map(item => item.classification).filter(Boolean))]
            .map(codeValue => allAccountCodes.find(c => c.value === codeValue))
            .filter((code): code is { value: string, label: string } => !!code)
            .sort((a, b) => a.label.localeCompare(b.label));

        const accountCodeFilteredItems = selectedAccountCode === 'all' ?
            centerFilteredItems :
            centerFilteredItems.filter(item => item.classification === selectedAccountCode);

        const availableArticles = getUniqueArticles(accountCodeFilteredItems);

        const articleFilteredItems = selectedArticle === 'all' ?
            accountCodeFilteredItems :
            accountCodeFilteredItems.filter(item => item.article === selectedArticle);

        const availableYears = getUniqueYears(articleFilteredItems);

        const yearFilteredItems = selectedYear === 'all' ?
            articleFilteredItems :
            articleFilteredItems.filter(item => {
                const acqDate = safeParseDate(item.acquisition_date);
                return acqDate && isValid(acqDate) && getYear(acqDate).toString() === selectedYear;
            });

        // --- Logic for Chart Filters ---
        const allActiveItems = allItems.filter(item => item.status === 'active');
        const cityOfficeNames = responsibilityCenters.filter(rc => rc.category === 'City Offices').map(rc => rc.name);
        const nationalOfficeNames = responsibilityCenters.filter(rc => rc.category === 'National Offices').map(rc => rc.name);
        
        // For "Items by Responsibility Center" chart
        const itemsForCenterChart = allActiveItems.filter(item => {
            const officeDetails = responsibilityCenters.find(rc => rc.name === item.responsibility_center);
            return officeCategoryFilter === 'City Offices' ? cityOfficeNames.includes(officeDetails?.name || '') : nationalOfficeNames.includes(officeDetails?.name || '');
        });

        const centerChartArticles = getUniqueArticles(itemsForCenterChart);
        
        const itemsForCenterYearFilter = centerArticleFilter === 'all'
            ? itemsForCenterChart
            : itemsForCenterChart.filter(i => i.article === centerArticleFilter);
            
        const centerChartYears = getUniqueYears(itemsForCenterYearFilter);

        // For "Yearly Acquisitions (City/National Offices)" charts
        const cityItems = allActiveItems.filter(item => cityOfficeNames.includes(item.responsibility_center || ''));
        const nationalItems = allActiveItems.filter(item => nationalOfficeNames.includes(item.responsibility_center || ''));

        const cityChartArticles = getUniqueArticles(cityItems);
        const nationalChartArticles = getUniqueArticles(nationalItems);

        return {
            uniqueResponsibilityCenters: allResponsibilityCenters,
            uniqueAccountCodes: availableAccountCodes,
            uniqueArticles: availableArticles,
            uniqueYears: availableYears,
            customQueryCount: yearFilteredItems.length,
            customQueryValue: yearFilteredItems.reduce((sum, item) => sum + (Number(item.acquisition_cost) || 0), 0),
            cityOffices: cityOfficeNames,
            nationalOffices: nationalOfficeNames,
            centerChartArticles,
            centerChartYears,
            cityChartArticles,
            nationalChartArticles,
        };
    }, [allItems, selectedCenter, selectedAccountCode, selectedArticle, selectedYear, officeCategoryFilter, centerArticleFilter]);

    const handleCenterChange = (value: string) => {
        setSelectedCenter(value);
        setSelectedAccountCode('all');
        setSelectedArticle('all');
        setSelectedYear('all');
    };

    const handleAccountCodeChange = (value: string) => {
        setSelectedAccountCode(value);
        setSelectedArticle('all');
        setSelectedYear('all');
    }

    const handleArticleChange = (value: string) => {
        setSelectedArticle(value);
        setSelectedYear('all');
    };
    
    const handleOfficeCategoryChange = (value: string) => {
        setOfficeCategoryFilter(value);
        setCenterArticleFilter('all');
        setCenterYearFilter('all');
    };

    const handleCenterArticleChange = (value: string) => {
        setCenterArticleFilter(value);
        setCenterYearFilter('all');
    };


  const analyticsData = useMemo(() => {
    const itemsForCards = (allItems || []).filter(item => {
        const centerMatch = selectedCenter === 'all' || item.responsibility_center === selectedCenter;
        const accountCodeMatch = selectedAccountCode === 'all' || item.classification === selectedAccountCode;
        const articleMatch = selectedArticle === 'all' || item.article === selectedArticle;
        
        const acqDate = safeParseDate(item.acquisition_date);
        const yearMatch = selectedYear === 'all' || (acqDate && isValid(acqDate) && getYear(acqDate).toString() === selectedYear);

        return centerMatch && accountCodeMatch && articleMatch && yearMatch;
    });

    const activeItems = itemsForCards.filter(item => item.status === 'active');
    const inactiveItems = itemsForCards.filter(item => item.status === 'inactive');

    const activeTotals = activeItems.reduce((acc, item) => {
        if (item.type === 'ics') acc.ics += 1;
        if (item.type === 'par') acc.par += 1;
        return acc;
    }, { ics: 0, par: 0 });

    const inactiveTotals = inactiveItems.reduce((acc, item) => {
        if (item.type === 'ics') acc.ics += 1;
        if (item.type === 'par') acc.par += 1;
        return acc;
    }, { ics: 0, par: 0 });

    const allActiveItems = (allItems || []).filter(item => item.status === 'active');
    const cityItems = allActiveItems.filter(item => cityOffices.includes(item.responsibility_center || ''));
    const nationalItems = allActiveItems.filter(item => nationalOffices.includes(item.responsibility_center || ''));

    const filterYearlyAcquisitions = (itemsToFilter: InventoryItem[], centerFilter: string, articleFilter: string) => {
        const filteredForChart = itemsToFilter.filter(item => {
            const centerMatch = centerFilter === 'all' || item.responsibility_center === centerFilter;
            const articleMatch = articleFilter === 'all' || item.article === articleFilter;
            return centerMatch && articleMatch;
        });

        return filteredForChart.reduce((acc, item) => {
            const acqDate = safeParseDate(item.acquisition_date);
            if (acqDate && isValid(acqDate)) {
                const year = getYear(acqDate).toString();
                const quantity = Number(item.item_quantity) || 1;
                if (!acc[year]) {
                    acc[year] = { year, ics: 0, par: 0 };
                }
                if (item.type === 'ics') acc[year].ics += quantity;
                if (item.type === 'par') acc[year].par += quantity;
            }
            return acc;
        }, {} as { [key: string]: { year: string; ics: number; par: number } });
    }

    const cityYearlyAcquisitions = filterYearlyAcquisitions(cityItems, cityYearlyAcquisitionsFilter, cityYearlyArticleFilter);
    const nationalYearlyAcquisitions = filterYearlyAcquisitions(nationalItems, nationalYearlyAcquisitionsFilter, nationalYearlyArticleFilter);

    const byResponsibilityCenter = allActiveItems.reduce((acc, item) => {
        const officeDetails = responsibilityCenters.find(rc => rc.name === item.responsibility_center);
        if (officeCategoryFilter !== 'all' && officeDetails?.category !== officeCategoryFilter) {
            return acc;
        }

        if (centerArticleFilter !== 'all' && item.article !== centerArticleFilter) {
            return acc;
        }
        
        const acqDate = safeParseDate(item.acquisition_date);
        const year = acqDate && isValid(acqDate) ? getYear(acqDate) : null;
        if (centerYearFilter !== 'all' && year?.toString() !== centerYearFilter) {
            return acc;
        }
        
        if (item.responsibility_center) {
            const name = responsibilityCenterAcronyms[item.responsibility_center] || item.responsibility_center;
            const quantity = Number(item.item_quantity) || 1;

            if (!acc[name]) {
                acc[name] = { name, fullName: item.responsibility_center, ics: 0, par: 0 };
            }
            if (item.type === 'ics') acc[name].ics += quantity;
            if (item.type === 'par') acc[name].par += quantity;
        }
        return acc;
    }, {} as { [key: string]: { name: string; fullName: string; ics: number; par: number } });


    return {
        totalActiveIcs: activeTotals.ics,
        totalActivePar: activeTotals.par,
        totalInactiveIcs: inactiveTotals.ics,
        totalInactivePar: inactiveTotals.par,
        grandTotal: activeTotals.ics + activeTotals.par,
        grandTotalInactive: inactiveTotals.ics + inactiveTotals.par,
        byCityYear: Object.values(cityYearlyAcquisitions).sort((a,b) => a.year.localeCompare(b.year)),
        byNationalYear: Object.values(nationalYearlyAcquisitions).sort((a,b) => a.year.localeCompare(b.year)),
        byCenter: Object.values(byResponsibilityCenter).sort((a,b) => a.name.localeCompare(b.name)),
    }
  }, [
      allItems,
      selectedCenter,
      selectedAccountCode,
      selectedArticle,
      selectedYear,
      cityOffices, 
      nationalOffices, 
      cityYearlyAcquisitionsFilter, 
      nationalYearlyAcquisitionsFilter, 
      centerArticleFilter, 
      centerYearFilter, 
      cityYearlyArticleFilter, 
      nationalYearlyArticleFilter, 
      officeCategoryFilter
    ]);

  const chartConfig = {
    ics: { label: "ICS", color: "hsl(217 89% 61%)" }, // blue
    par: { label: "PAR", color: "hsl(140 80% 50%)" }, // green
  } as const;

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 md:px-8">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-semibold font-headline">Document Tracking</h1>
      </div>
       <ScrollArea className="h-full">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                 <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Custom Query</CardTitle>
                        <CardDescription>Select filters to see a specific count of inventory items.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col xl:flex-row gap-4 xl:items-end">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                             <div className="grid gap-2 w-full">
                                <Label>Responsibility Center</Label>
                                 <Select value={selectedCenter} onValueChange={handleCenterChange} disabled={isLoading}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Center..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Centers</SelectItem>
                                        {uniqueResponsibilityCenters.map(center => <SelectItem key={center} value={center}>{center}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2 w-full">
                                <Label>Account Code</Label>
                                 <Select value={selectedAccountCode} onValueChange={handleAccountCodeChange} disabled={isLoading || selectedCenter === 'all'}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Account Code..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Account Codes</SelectItem>
                                        {uniqueAccountCodes.map(code => <SelectItem key={code.value} value={code.value}>{code.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2 w-full">
                                <Label>Article</Label>
                                <Select value={selectedArticle} onValueChange={handleArticleChange} disabled={isLoading || selectedAccountCode === 'all'}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Article..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Articles</SelectItem>
                                        {uniqueArticles.map(article => <SelectItem key={article} value={article}>{article}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="grid gap-2 w-full">
                                <Label>Year</Label>
                                <Select value={selectedYear} onValueChange={setSelectedYear} disabled={isLoading || selectedArticle === 'all'}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Year..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Years</SelectItem>
                                        {uniqueYears.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-around p-4 bg-secondary rounded-md w-full xl:w-auto xl:min-w-[280px] gap-4 mt-4 xl:mt-0">
                             <div className="text-center">
                                <span className="text-sm text-muted-foreground">Total Count</span>
                                <p className="text-4xl font-bold">{isLoading ? <Loader2 className="animate-spin" /> : customQueryCount}</p>
                            </div>
                            <div className="text-center">
                                <span className="text-sm text-muted-foreground">Total Value</span>
                                 <p className="text-4xl font-bold">{isLoading ? <Loader2 className="animate-spin" /> : `₱${customQueryValue.toLocaleString()}`}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Total Active ICS</CardTitle>
                        <CardDescription>Total number of all active ICS items.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-12 w-24" /> : <p className="text-4xl font-bold">{analyticsData.totalActiveIcs}</p>}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Total Active PAR</CardTitle>
                        <CardDescription>Total number of all active PAR items.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-12 w-24" /> : <p className="text-4xl font-bold">{analyticsData.totalActivePar}</p>}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Grand Total Active Items</CardTitle>
                        <CardDescription>Total number of all active inventory items.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-12 w-24" /> : <p className="text-4xl font-bold">{analyticsData.grandTotal}</p>}
                    </CardContent>
                </Card>

                 <Card className="border-destructive">
                    <CardHeader>
                        <CardTitle>Total Inactive ICS</CardTitle>
                        <CardDescription>Total number of all inactive ICS items.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-12 w-24" /> : <p className="text-4xl font-bold">{analyticsData.totalInactiveIcs}</p>}
                    </CardContent>
                </Card>
                 <Card className="border-destructive">
                    <CardHeader>
                        <CardTitle>Total Inactive PAR</CardTitle>
                        <CardDescription>Total number of all inactive PAR items.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-12 w-24" /> : <p className="text-4xl font-bold">{analyticsData.totalInactivePar}</p>}
                    </CardContent>
                </Card>
                 <Card className="border-destructive">
                    <CardHeader>
                        <CardTitle>Grand Total Inactive Items</CardTitle>
                        <CardDescription>Total number of all inactive inventory items.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-12 w-24" /> : <p className="text-4xl font-bold">{analyticsData.grandTotalInactive}</p>}
                    </CardContent>
                </Card>

                <div className="lg:col-span-4">
                  <ChartCard
                      cardTitle="Items by Responsibility Center"
                      cardDescription="Total active items for each office, separated by type."
                      data={analyticsData.byCenter}
                      config={chartConfig}
                      isLoading={isLoading}
                      xAxisDataKey="name"
                      scrollable={true}
                  >
                    <div className="flex items-center justify-end flex-wrap gap-2">
                        <div className="w-[150px]">
                            <Select value={officeCategoryFilter} onValueChange={handleOfficeCategoryChange} disabled={isLoading}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by Category..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="City Offices">City Offices</SelectItem>
                                    <SelectItem value="National Offices">National Offices</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-[150px]">
                            <Select value={centerArticleFilter} onValueChange={handleCenterArticleChange} disabled={isLoading}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by Article..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Articles</SelectItem>
                                    {centerChartArticles.map(article => <SelectItem key={article} value={article}>{article}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-[120px]">
                            <Select value={centerYearFilter} onValueChange={setCenterYearFilter} disabled={isLoading}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by Year..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Years</SelectItem>
                                    {centerChartYears.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                  </ChartCard>
                </div>

                <div className="lg:col-span-2">
                  <ChartCard
                      cardTitle="Yearly Acquisitions (City Offices)"
                      cardDescription="Active items acquired per year."
                      data={analyticsData.byCityYear}
                      config={chartConfig}
                      isLoading={isLoading}
                      xAxisDataKey="year"
                      scrollable={true}
                  >
                    <div className="flex items-center justify-end flex-wrap gap-2">
                        <div className="w-[150px]">
                          <Select value={cityYearlyArticleFilter} onValueChange={setCityYearlyArticleFilter} disabled={isLoading}>
                              <SelectTrigger>
                                  <SelectValue placeholder="Filter by Article..." />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">All Articles</SelectItem>
                                  {cityChartArticles.map(article => <SelectItem key={article} value={article}>{article}</SelectItem>)}
                              </SelectContent>
                          </Select>
                        </div>
                        <div className="w-[200px]">
                          <Select value={cityYearlyAcquisitionsFilter} onValueChange={setCityYearlyAcquisitionsFilter} disabled={isLoading}>
                              <SelectTrigger>
                                  <SelectValue placeholder="Filter by Center..." />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">All City Offices</SelectItem>
                                  {cityOffices.map(center => <SelectItem key={center} value={center}>{center}</SelectItem>)}
                              </SelectContent>
                          </Select>
                        </div>
                    </div>
                  </ChartCard>
                </div>

                <div className="lg:col-span-2">
                  <ChartCard
                      cardTitle="Yearly Acquisitions (National Offices)"
                      cardDescription="Active items acquired per year."
                      data={analyticsData.byNationalYear}
                      config={chartConfig}
                      isLoading={isLoading}
                      xAxisDataKey="year"
                      scrollable={true}
                  >
                     <div className="flex items-center justify-end flex-wrap gap-2">
                        <div className="w-[150px]">
                          <Select value={nationalYearlyArticleFilter} onValueChange={setNationalYearlyArticleFilter} disabled={isLoading}>
                              <SelectTrigger>
                                  <SelectValue placeholder="Filter by Article..." />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">All Articles</SelectItem>
                                  {nationalChartArticles.map(article => <SelectItem key={article} value={article}>{article}</SelectItem>)}
                              </SelectContent>
                          </Select>
                        </div>
                        <div className="w-[200px]">
                          <Select value={nationalYearlyAcquisitionsFilter} onValueChange={setNationalYearlyAcquisitionsFilter} disabled={isLoading}>
                              <SelectTrigger>
                                  <SelectValue placeholder="Filter by Center..." />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">All National Offices</SelectItem>
                                  {nationalOffices.map(center => <SelectItem key={center} value={center}>{center}</SelectItem>)}
                              </SelectContent>
                          </Select>
                        </div>
                    </div>
                  </ChartCard>
                </div>
            </div>
      </ScrollArea>
    </main>
  );
}

    

    





