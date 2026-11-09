import type { ReactNode } from "react";

interface Testimonial {
  quote: string;
  name: string;
  title: string;
}

interface AuthLayoutProps {
  children: ReactNode;
  imageUrl: string;
  testimonial?: Testimonial;
}

const DEFAULT_TESTIMONIAL: Testimonial = {
  quote:
    "NomNom has completely changed how we experience food at the office. The quality and variety are simply unmatched.",
  name: "Sarah Jenkins",
  title: "PRODUCT MANAGER, TECHCORP",
};

export function AuthLayout({
  children,
  imageUrl,
  testimonial = DEFAULT_TESTIMONIAL,
}: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="flex justify-center px-6 pb-10 pt-4 sm:px-8">
        <div className="flex w-full max-w-md flex-col">
          {children}
        </div>
      </div>
      <div className="relative hidden md:block">
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute bottom-8 right-8 max-w-sm rounded-xl bg-black/40 p-6 text-white backdrop-blur">
          <div className="mb-3 flex gap-1 text-amber-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i}>★</span>
            ))}
          </div>
          <p className="text-lg font-medium italic">"{testimonial.quote}"</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v3h16v-3c0-2.76-3.58-5-8-5Z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold">{testimonial.name}</div>
              <div className="text-xs text-white/70">{testimonial.title}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
