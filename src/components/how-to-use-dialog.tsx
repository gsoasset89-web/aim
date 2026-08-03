
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  HelpCircle,
  PlusCircle,
  Search,
  FilePenLine,
  Trash2,
  CalendarClock,
  Upload,
  Archive,
  BarChart2,
  CheckCircle,
} from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

export function HowToUseDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="gap-2"
        >
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">How to Use</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle />
            How to Use A.I.M
          </DialogTitle>
          <DialogDescription>
            A quick guide to get you started with the Asset Inventory
            Management system.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-6">
          <div className="grid gap-6 py-4 text-sm">
            <div className="flex items-start gap-4">
              <PlusCircle className="h-6 w-6 mt-1 text-primary flex-shrink-0" />
              <div>
                <h4 className="font-semibold">
                  1. Adding a New Item
                </h4>
                <p className="text-muted-foreground">
                  Navigate to "Add New Entry" to create ICS or PAR items. Fill in the necessary details in the form. All new submissions will require approval before they appear in the main inventory.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Search className="h-6 w-6 mt-1 text-primary flex-shrink-0" />
              <div>
                <h4 className="font-semibold">
                  2. Searching and Filtering
                </h4>
                <p className="text-muted-foreground">
                  On the inventory pages (ICS, PAR, etc.), use the main search bar to find items by keywords. Use the filter dropdowns to narrow down your results by date, responsibility center, accountable person, and more.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <FilePenLine className="h-6 w-6 mt-1 text-primary flex-shrink-0" />
              <div>
                <h4 className="font-semibold">
                  3. Editing an Item
                </h4>
                <p className="text-muted-foreground">
                  To update an item, click the three-dots menu on its row and select "Request Edit". Your proposed changes will be submitted for approval. You can also edit inactive items (like those in WMR/PRS) to add or update disposition details.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Upload className="h-6 w-6 mt-1 text-primary flex-shrink-0" />
              <div>
                <h4 className="font-semibold">
                  4. Importing Data from CSV
                </h4>
                <p className="text-muted-foreground">
                  Go to "Import Data" to bulk-add items from a CSV file. The system directly imports new items and automatically skips duplicates. An item is considered a duplicate if it has the same Number, Serial Number, Brand/Model, and Classification.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <BarChart2 className="h-6 w-6 mt-1 text-primary flex-shrink-0" />
              <div>
                <h4 className="font-semibold">
                  5. Data Analytics & Tracking
                </h4>
                <p className="text-muted-foreground">
                  Use the "Document Tracking" page to view charts and analytics about your inventory. You can see breakdowns by office, acquisition year, and more to gain insights into your asset distribution.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <CalendarClock className="h-6 w-6 mt-1 text-primary flex-shrink-0" />
              <div>
                <h4 className="font-semibold">
                  6. Setting Deadlines & Notifications
                </h4>
                <p className="text-muted-foreground">
                  Admins and Developers can set deadlines for items, and you will receive notifications for those that are approaching or overdue. Once a task is complete, an Admin/Developer can use the "Mark as Accomplished" action to clear the deadline.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Archive className="h-6 w-6 mt-1 text-yellow-500 flex-shrink-0" />
              <div>
                <h4 className="font-semibold">
                  7. Deactivating and Restoring Items
                </h4>
                <p className="text-muted-foreground">
                  To move an active item to an inactive report (WMR/PRS), use the "Request Deactivation" action. To move an inactive item back to the active inventory, use "Request Restore". Both actions require approval.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Trash2 className="h-6 w-6 mt-1 text-destructive flex-shrink-0" />
              <div>
                <h4 className="font-semibold">
                  8. Deleting an Item
                </h4>
                <p className="text-muted-foreground">
                  You can request to permanently delete any item by clicking the three-dots menu and selecting "Request Delete". This action requires approval to finalize.
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
