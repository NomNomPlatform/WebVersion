import type { LucideIcon } from "lucide-react";
import { CreditCard, QrCode, Banknote } from "lucide-react";
import { Wallet } from "lucide-react";

import { features } from "@/lib/features";

export type PaymentMethodId = "card" | "vnpay" | "cash";

export interface PaymentMethodOption {
  id: PaymentMethodId;
  label: string;
  detail: string;
  icon: LucideIcon;
  comingSoon?: boolean;
}

export const PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
  {
    id: "card",
    label: "Credit Card",
    detail: "**** 1234",
    icon: CreditCard,
  },
  {
    id: "vnpay",
    label: "VNPay",
    detail: "Scan & Pay",
    icon: QrCode,
    comingSoon: !features.payments,
  },
  {
    id: "cash",
    label: "Cash",
    detail: "Pay on arrival",
    icon: Banknote,
  },
];

interface PaymentSectionProps {
  value: PaymentMethodId;
  onChange: (value: PaymentMethodId) => void;
}

export function PaymentSection({ value, onChange }: PaymentSectionProps) {
  return (
    <section className="bg-white rounded-xl p-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] border border-[#d7dadf]/20">
      <h2 className="text-2xl leading-8 font-semibold text-[#181c20] mb-4 flex items-center gap-2">
        <Wallet className="w-5 h-5 text-[#ab3500]" fill="currentColor" />
        Payment Method
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PAYMENT_METHOD_OPTIONS.map(({ id, label, detail, icon: Icon, comingSoon }) => {
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (!comingSoon) onChange(id);
              }}
              disabled={comingSoon}
              title={comingSoon ? "Tính năng đang phát triển" : undefined}
              className={`relative flex flex-col h-full items-start p-4 rounded-xl text-left transition-all border ${
                comingSoon
                  ? "bg-[#f7f9ff] border-[#e0e3e8] opacity-60 cursor-not-allowed"
                  : selected
                  ? "bg-[#fff4f1] border-[#ab3500] ring-1 ring-[#ab3500]"
                  : "bg-[#f1f4f9] border-[#e0e3e8] hover:border-[#ab3500]/50 cursor-pointer"
              }`}
            >
              {comingSoon && (
                <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider bg-[#ffdbd0] text-[#ab3500] px-1.5 py-0.5 rounded-full">
                  Soon
                </span>
              )}
              <Icon
                className={`w-5 h-5 mb-2 ${
                  selected && !comingSoon ? "text-[#ab3500]" : "text-[#594139]"
                }`}
              />
              <span className="text-sm font-semibold text-[#181c20]">{label}</span>
              <span className="text-xs text-[#594139] mt-1">{detail}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
