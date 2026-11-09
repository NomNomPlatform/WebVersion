import { NotebookPen } from "lucide-react";

interface DeliveryNoteSectionProps {
  value: string;
  onChange: (value: string) => void;
}

export function DeliveryNoteSection({ value, onChange }: DeliveryNoteSectionProps) {
  return (
    <section className="bg-white rounded-xl p-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] border border-[#d7dadf]/20">
      <h2 className="text-2xl leading-8 font-semibold text-[#181c20] mb-2 flex items-center gap-2">
        <NotebookPen className="w-5 h-5 text-[#ab3500]" fill="currentColor" />
        Delivery Note
        <span className="text-sm font-normal text-[#594139]/60 ml-1">(optional)</span>
      </h2>
      <textarea
        id="checkout-note"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Leave at the door, call upon arrival, etc..."
        className="w-full border border-[#e0e3e8] rounded-lg focus:border-[#ab3500] focus:ring-1 focus:ring-[#ab3500] bg-[#f1f4f9] text-base text-[#181c20] p-4 transition-shadow outline-none resize-none"
      />
      <p className="text-xs text-[#594139]/50 text-right mt-1">
        {value.length}/500
      </p>
    </section>
  );
}
