import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Select({ value, onValueChange, children, className }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Find selected label from SelectItem children
  const options = React.Children.toArray(children).flatMap((child: any) => {
    if (!child) return [];
    return [{ value: child.props?.value, label: child.props?.children }];
  });
  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-2 h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 w-full"
      >
        <span>{selectedLabel}</span>
        <ChevronDown className={cn("w-4 h-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg py-1">
          {React.Children.map(children, (child: any) => {
            if (!child) return null;
            const childValue = child.props?.value;
            return (
              <button
                key={child.key}
                type="button"
                onClick={() => {
                  onValueChange(childValue);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-slate-100 transition-colors",
                  childValue === value && "bg-slate-50 text-[#ab3500] font-medium"
                )}
              >
                {child.props?.children}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Re-export for API compatibility
export const SelectContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}
export const SelectItem = ({ value: _value, children }: SelectItemProps) => <>{children}</>;

interface SelectTriggerProps {
  children?: React.ReactNode;
  className?: string;
}
export const SelectTrigger = ({ children }: SelectTriggerProps) => <>{children}</>;

interface SelectValueProps {
  placeholder?: string;
}
export const SelectValue = ({ placeholder }: SelectValueProps) => <span>{placeholder}</span>;
