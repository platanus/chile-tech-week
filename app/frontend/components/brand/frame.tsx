import { Head, usePage } from '@inertiajs/react';
import { type ReactNode, useState } from 'react';
import { brand_icon_path, brand_path, brand_wireframe_path, root_path } from '@/routes';

// The brand pages' chrome, styled like the landing: Unbounded display, Space Mono labels,
// 1px lines, 2px radii. `.label` and `.btn` come from landing.css; that file also styles bare
// <main> and <footer>, so the content sits in a <section> and the footer is the landing's.

const NAV = [
  { name: 'Marca', path: brand_path },
  { name: 'Ícono', path: brand_icon_path },
  { name: 'Wireframe', path: brand_wireframe_path },
];

export function BrandFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const current = usePage().url.split('?')[0].replace(/\/$/, '');
  return (
    <div className="min-h-screen bg-black text-white">
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Head>

      <header className="flex items-center justify-between gap-6 border-b border-(--line) px-[8vw] py-[26px]">
        <a
          href={root_path()}
          className="font-(family-name:--display) text-[15px] font-extrabold tracking-[-0.02em] text-white no-underline"
        >
          CLTW<b className="text-(--red)">26</b>
        </a>
        <nav className="label flex gap-5">
          {NAV.map(({ name, path }) => {
            const href = path();
            const active = current === href;
            return (
              <a
                key={href}
                href={href}
                className={`no-underline hover:text-white ${active ? 'text-white' : 'text-(--gray)'}`}
                aria-current={active ? 'page' : undefined}
              >
                {name}
              </a>
            );
          })}
        </nav>
      </header>

      <section className="mx-auto flex max-w-[1120px] flex-col gap-20 px-[8vw] pt-[6vh] pb-[14vh]">{children}</section>

      <footer className="label">
        <span>Chile Tech Week 2026</span>
        <a href={root_path()}>techweek.cl</a>
      </footer>
    </div>
  );
}

/** A titled block: red mono eyebrow, Unbounded heading, grey lede. */
export function Section({
  id,
  eyebrow,
  heading,
  lede,
  children,
  level = 'h2',
}: {
  id?: string;
  eyebrow: string;
  heading: string;
  lede?: ReactNode;
  children?: ReactNode;
  level?: 'h1' | 'h2';
}) {
  const Heading = level;
  return (
    <div id={id} className="flex flex-col gap-10 scroll-mt-8">
      <div>
        <div className="label text-(--red)">{eyebrow}</div>
        <Heading
          className={`font-(family-name:--display) mt-4 mb-0 leading-[0.95] font-extrabold tracking-[-0.03em] uppercase ${
            level === 'h1' ? 'text-[clamp(30px,4.6vw,64px)]' : 'text-[clamp(24px,3vw,40px)]'
          }`}
        >
          {heading}
        </Heading>
        {lede && (
          <p className="mt-5 mb-0 max-w-[52ch] text-[clamp(16px,1.3vw,19px)] leading-[1.55] text-(--gray)">{lede}</p>
        )}
      </div>
      {children}
    </div>
  );
}

/** Tailwind classes for the three surfaces a mark is previewed on. */
export const SURFACE = {
  black: 'bg-black',
  white: 'bg-white',
  checker:
    'bg-[#3a3a3a] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0px] bg-[image:linear-gradient(45deg,#1c1c1c_25%,transparent_25%),linear-gradient(-45deg,#1c1c1c_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1c1c1c_75%),linear-gradient(-45deg,transparent_75%,#1c1c1c_75%)]',
} as const;

/** A small mono button; `active` inverts it. No preflight, so every default is set here. */
export function Chip({
  active = false,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={`cursor-pointer rounded-[2px] border px-3 py-1.5 font-(family-name:--mono) text-[11px] tracking-[0.14em] uppercase transition-colors ${
        active
          ? 'border-white bg-white text-black'
          : 'border-(--line) bg-transparent text-white hover:border-(--gray)'
      } disabled:cursor-default disabled:opacity-40 ${className}`}
      {...props}
    />
  );
}

/** A row of chips choosing one of `items`. */
export function Seg<T extends string>({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: T;
  items: { id: T; name: string; disabled?: boolean }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="label text-(--gray)">{label}</div>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {items.map((it) => (
          <Chip
            key={it.id}
            role="radio"
            aria-checked={value === it.id}
            active={value === it.id}
            disabled={it.disabled}
            onClick={() => onChange(it.id)}
          >
            {it.name}
          </Chip>
        ))}
      </div>
    </div>
  );
}

/** Clipboard with a short "copied" state; silent when the clipboard is not available. */
export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1500);
    } catch {
      // Clipboard denied: the value is printed next to the button anyway.
    }
  };
  return { copied, copy };
}

/** Hands the browser a file to save. */
export function saveBlob(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
