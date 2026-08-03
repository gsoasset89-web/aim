import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, isValid } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import type { InventoryItem } from '@/lib/types';

const safeParseDate = (dateInput: any): Date | null => {
  if (!dateInput) return null;

  // Handle strings
  if (typeof dateInput === 'string') {
    const parsed = new Date(dateInput);
    return isValid(parsed) ? parsed : null;
  }

  // Handle Firestore Timestamps (either real instances or POJOs with seconds)
  if (typeof dateInput === 'object' && 'seconds' in dateInput) {
    if (typeof dateInput.toDate === 'function') {
      return dateInput.toDate();
    }
    // Fallback for plain objects from JSON/Serialization
    return new Date(dateInput.seconds * 1000);
  }
  
  return null;
};

export const formatDateForDisplay = (dateValue: any): string => {
  const date = safeParseDate(dateValue);
  if (!date || !isValid(date)) return '';
  return format(date, 'MM/dd/yyyy');
};

export interface ReportColumn {
  header: string;
  dataKey: keyof InventoryItem | string;
}

export interface Signatory {
  label: string;
  name: string;
}

export const generateInventoryReport = (items: InventoryItem[], title: string, selectedColumns?: ReportColumn[]) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: 'legal',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`${title} Report`, pageWidth / 2, 30, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${format(new Date(), 'MMMM d, yyyy')}`, pageWidth / 2, 45, { align: 'center' });

  const columns = selectedColumns || [
    { header: 'ID', dataKey: 'id' },
    { header: 'Article', dataKey: 'article' },
    { header: 'Brand/Model', dataKey: 'brand_model' },
    { header: 'Serial No.', dataKey: 'serial_number' },
    { header: 'Number', dataKey: 'number' },
    { header: 'Acq. Date', dataKey: 'acquisition_date' },
    { header: 'Cost', dataKey: 'acquisition_cost' },
    { header: 'Property No.', dataKey: 'property_number' },
    { header: 'Responsibility Center', dataKey: 'responsibility_center' },
    { header: 'Accountable Person', dataKey: 'accountable_person' },
  ];

  const body = items.map(item => {
    const row: any = { ...item };
    
    // Format special fields
    if (row.acquisition_date) row.acquisition_date = formatDateForDisplay(item.acquisition_date);
    if (row.date_received) row.date_received = formatDateForDisplay(item.date_received);
    if (row.acquisition_cost !== undefined) row.acquisition_cost = Number(item.acquisition_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
    if (row.unit_value !== undefined) row.unit_value = Number(item.unit_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
    
    return row;
  });

  (doc as any).autoTable({
    startY: 60,
    columns,
    body,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    didParseCell: (data: any) => {
        if (data.column.dataKey === 'acquisition_cost' || data.column.dataKey === 'unit_value') {
            data.cell.styles.halign = 'right';
        }
    }
  });

  return doc;
};

export const generateInventoryCountForm = (items: InventoryItem[], officeName: string, signatories: Signatory[], selectedColumns: ReportColumn[]) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'legal' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('REPORT ON PHYSICAL COUNT OF PROPERTY, PLANT AND EQUIPMENT', pageWidth / 2, 30, { align: 'center' });
  doc.text(officeName.toUpperCase(), pageWidth / 2, 42, { align: 'center' });
  doc.text(`As of ${format(new Date(), 'MMMM d, yyyy')}`, pageWidth / 2, 64, { align: 'center' });

  const body = items.map(item => {
    return selectedColumns.map(col => {
      let value = (item as any)[col.dataKey];
      if (col.dataKey === 'acquisition_date' || col.dataKey === 'date_received') {
        return formatDateForDisplay(value);
      }
      if (col.dataKey === 'acquisition_cost' || col.dataKey === 'unit_value') {
        return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
      }
      return String(value || '');
    });
  });

  (doc as any).autoTable({
    startY: 80,
    head: [selectedColumns.map(col => col.header.toUpperCase())],
    body: body,
    theme: 'grid',
    styles: { font: 'times', fontSize: 6, lineWidth: 0.5, cellPadding: 2 },
    headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', halign: 'center' },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 40;
  doc.setFontSize(8);
  doc.text("Signatories:", margin, finalY);
  
  const colWidth = (pageWidth - (margin * 2)) / 4;
  
  signatories.forEach((sig, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const x = margin + (col * colWidth);
    const y = finalY + 20 + (row * 60);

    doc.setFont('times', 'bold');
    doc.text(sig.label + ":", x, y);
    doc.setFont('times', 'normal');
    doc.text("_______________________", x, y + 20);
    if (sig.name) {
      doc.setFont('times', 'bold');
      doc.text(sig.name, x, y + 35);
    }
  });
  
  return doc;
};