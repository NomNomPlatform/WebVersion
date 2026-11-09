import { MapPin } from "lucide-react";

interface AddressSectionProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function AddressSection({ value, onChange, error }: AddressSectionProps) {
  return (
    <section className="bg-white rounded-xl p-6 shadow-[0px_2px_8px_rgba(0,0,0,0.04)] border border-[#d7dadf]/20">
      <h2 className="text-2xl leading-8 font-semibold text-[#181c20] mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-[#ab3500]" fill="currentColor" />
        Delivery Address
      </h2>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="checkout-address"
          className="text-sm font-medium text-[#594139]"
        >
          Enter your delivery address
        </label>
        <input
          id="checkout-address"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. 123 Culinary Avenue, Apt 4B, City 10012"
          className={`w-full border rounded-lg focus:ring-1 bg-[#f1f4f9] text-base text-[#181c20] px-4 py-3 transition-shadow outline-none ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-400"
              : "border-[#e0e3e8] focus:border-[#ab3500] focus:ring-[#ab3500]"
          }`}
        />
        {error && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
