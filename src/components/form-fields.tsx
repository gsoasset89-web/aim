'use client';

import React, { useState, useEffect } from 'react';
import { FormControl } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getDaysInMonth, getYear, getMonth, getDate } from 'date-fns';

export const DatePickerField = ({ field, ...props }: { field: any }) => {
    const initialDate = field.value ? new Date(field.value) : null;

    const [year, setYear] = useState<number | null>(initialDate ? getYear(initialDate) : null);
    const [month, setMonth] = useState<number | null>(initialDate ? getMonth(initialDate) : null);
    const [day, setDay] = useState<number | null>(initialDate ? getDate(initialDate) : null);

    useEffect(() => {
        if (year !== null && month !== null && day !== null) {
            const newDate = new Date(year, month, day);
            if (field.value?.getTime() !== newDate.getTime()) {
                field.onChange(newDate);
            }
        } else if (field.value !== undefined) {
            field.onChange(undefined);
        }
    }, [year, month, day, field.onChange]);

    const years = Array.from({ length: 100 }, (_, i) => getYear(new Date()) - i);
    const months = Array.from({ length: 12 }, (_, i) => ({
        value: i,
        label: new Date(0, i).toLocaleString('default', { month: 'long' }),
    }));
    
    const daysInMonth = (year !== null && month !== null) ? getDaysInMonth(new Date(year, month)) : 31;
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const handleYearChange = (value: string) => {
        const newYear = value ? parseInt(value, 10) : null;
        setYear(newYear);
        if (day !== null && month !== null && newYear !== null) {
            const newDaysInMonth = getDaysInMonth(new Date(newYear, month));
            if (day > newDaysInMonth) {
                setDay(newDaysInMonth);
            }
        }
    };
    
    const handleMonthChange = (value: string) => {
        const newMonth = value ? parseInt(value, 10) : null;
        setMonth(newMonth);
        if (day !== null && year !== null && newMonth !== null) {
            const newDaysInMonth = getDaysInMonth(new Date(year, newMonth));
            if (day > newDaysInMonth) {
                setDay(newDaysInMonth);
            }
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-2">
            <FormControl>
                <Select value={month !== null ? String(month) : ''} onValueChange={handleMonthChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                        {months.map(m => (
                            <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FormControl>
            <FormControl>
                <Select value={day !== null ? String(day) : ''} onValueChange={(v) => setDay(v ? parseInt(v, 10) : null)} disabled={month === null}>
                    <SelectTrigger>
                        <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                        {days.map(d => (
                            <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FormControl>
            <FormControl>
                <Select value={year !== null ? String(year) : ''} onValueChange={handleYearChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map(y => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FormControl>
        </div>
    );
};
