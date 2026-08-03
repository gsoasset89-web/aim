
'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FormControl } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';

type ComboboxData = {
  value: string;
  label: string;
};

export const ComboboxDialog = ({
  field,
  data,
  placeholder,
  dialogTitle,
  disabled = false,
}: {
  field: any;
  data: ComboboxData[];
  placeholder: string;
  dialogTitle: string;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);

  const getDisplayValue = (currentValue: string) => {
    if (!currentValue) return placeholder;
    const selectedItem = data.find((item) => {
      const itemValue = item.value || '';
      return itemValue.toLowerCase() === currentValue.toLowerCase();
    });

    if (!selectedItem) return currentValue;

    if (selectedItem.label.includes(selectedItem.value)) {
      return selectedItem.value;
    }

    return selectedItem.label || currentValue;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <FormControl>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="truncate">{getDisplayValue(field.value)}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </FormControl>
      </DialogTrigger>
      <DialogContent className="p-0 gap-0 w-[90vw] max-w-[500px] rounded-lg">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <Command>
          <CommandInput
            placeholder="Search or type..."
            className="h-12 border-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <CommandList>
            <ScrollArea className="h-64">
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {(data || [])
                  .filter((item) => item && item.value)
                  .map((item) => {
                    const itemValue = item.value;
                    const itemLabel = item.label;
                    return (
                      <CommandItem
                        key={itemValue}
                        value={itemValue}
                        onSelect={(currentValue) => {
                          const finalValue =
                            currentValue === (field.value || '').toLowerCase()
                              ? ''
                              : itemValue;
                          field.onChange(finalValue);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            (field.value || '').toLowerCase() ===
                              itemValue.toLowerCase()
                              ? 'opacity-100'
                              : 'opacity-0'
                          )}
                        />
                        {itemLabel}
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};

export const ComboboxDialogRC = ({
  field,
  data,
  placeholder,
  dialogTitle,
}: {
  field: any;
  data: { code: string; name: string }[];
  placeholder: string;
  dialogTitle: string;
}) => {
  const [open, setOpen] = useState(false);

  const getDisplayValue = (currentValue: string) => {
    if (!currentValue) return placeholder;
    const selectedItem = data.find(
      (item) => (item.name || '').toLowerCase() === currentValue.toLowerCase()
    );
    return selectedItem ? selectedItem.name : currentValue;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <FormControl>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="truncate">{getDisplayValue(field.value)}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </FormControl>
      </DialogTrigger>
      <DialogContent className="p-0 gap-0 w-[90vw] max-w-[500px] rounded-lg">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <Command>
          <CommandInput
            placeholder="Search or type..."
            className="h-12 border-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <CommandList>
            <ScrollArea className="h-64">
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {(data || [])
                  .filter((item) => item && item.name)
                  .map((item, index) => (
                    <CommandItem
                      key={`${item.name}-${index}`}
                      value={item.name}
                      onSelect={(currentValue) => {
                        const finalValue =
                          currentValue === (field.value || '').toLowerCase()
                            ? ''
                            : item.name;
                        field.onChange(finalValue);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          (field.value || '').toLowerCase() ===
                            (item.name || '').toLowerCase()
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                      {item.name}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};
