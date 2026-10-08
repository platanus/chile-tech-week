import { Form, Link } from '@inertiajs/react';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { copy, useI18n } from '@/lib/i18n';
import { new_event_path } from '@/routes';
import type { LumaImport } from '@/types';

const COPY = copy(
  {
    banner: '¿Ya creaste tu evento en Luma?',
    bannerLink: 'Impórtalo y ahorra el formulario',
    title: 'Trae tu evento de Luma',
    intro: 'Pega el link de tu evento y llenamos el formulario con sus datos.',
    placeholder: 'luma.com/mi-evento',
    check: 'Verificar',
    recheck: 'Verificar de nuevo',
    steps: 'Para que podamos listarlo, tu evento debe estar en público y tener a nuestra cuenta como host:',
    stepPublic: 'Ponlo en Público: Manage → Event Page → Visibility.',
    stepHost: (email: string) => `Agrega a ${email} como host: Manage → Hosts → Add Host.`,
    gifAlt: 'Cómo agregar a Chile Tech Week como host de tu evento en Luma',
    copyEmail: 'Copiar correo',
    copied: 'Copiado',
    found: 'Encontramos este evento',
    confirm: 'Sí, es mi evento',
    other: 'Usar otro link',
    fromLuma: 'Desde Luma',
    fromLumaNote: 'El título, las fechas y la portada se toman de tu evento en Luma y se sincronizan solos: edítalos allá.',
    scratch: 'Prefiero crear el evento desde cero',
  },
  {
    banner: 'Already created your event on Luma?',
    bannerLink: 'Import it and skip most of the form',
    title: 'Bring your event from Luma',
    intro: 'Paste your event link and we fill the form with its details.',
    placeholder: 'luma.com/my-event',
    check: 'Verify',
    recheck: 'Verify again',
    steps: 'To list it, your event must be public and have our account as a host:',
    stepPublic: 'Make it Public: Manage → Event Page → Visibility.',
    stepHost: (email: string) => `Add ${email} as a host: Manage → Hosts → Add Host.`,
    gifAlt: 'How to add Chile Tech Week as a host of your event on Luma',
    copyEmail: 'Copy email',
    copied: 'Copied',
    found: 'We found this event',
    confirm: "Yes, it's my event",
    other: 'Use another link',
    fromLuma: 'From Luma',
    fromLumaNote: "The title, dates and cover come from your Luma event and sync on their own: edit them there.",
    scratch: 'I would rather create the event from scratch',
  },
);

const formatDate = (iso: string, locale: string) =>
  new Date(iso).toLocaleString(locale === 'en' ? 'en-US' : 'es-CL', {
    timeZone: 'America/Santiago',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

// `?luma=` with no value is how the importer asks for the link: js-routes drops empty query
// params, so the URL is built by hand.
const askPath = (lp: { locale?: 'en' }) => `${new_event_path(lp)}?luma=`;

/** The link to the importer, shown above the regular form. */
export function LumaImportBanner() {
  const { t, lp } = useI18n(COPY);
  return (
    <Link href={askPath(lp)} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm border border-border px-4 py-3 text-sm hover:border-primary">
      <span className="text-muted-foreground">{t.banner}</span>
      <span className="label text-primary">{t.bannerLink} →</span>
    </Link>
  );
}

function CopyEmail({ email }: { email: string }) {
  const { t } = useI18n(COPY);
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="label text-primary hover:underline"
      onClick={() => navigator.clipboard?.writeText(email).then(() => setDone(true))}
    >
      {done ? t.copied : t.copyEmail}
    </button>
  );
}

/** The Luma link: asked for, refused with the reason and what to do, or found and confirmed. */
export function LumaImportPanel({ luma, hostEmail, onConfirm }: { luma: LumaImport; hostEmail: string; onConfirm: () => void }) {
  const { t, locale, lp } = useI18n(COPY);

  if (luma.state === 'ok' && luma.event) {
    return (
      <div className="flex flex-col gap-6">
        <div className="label text-primary">{t.found}</div>
        <div className="flex flex-col gap-4 rounded-sm border border-border p-4 sm:flex-row">
          {luma.event.cover_url && <img src={luma.event.cover_url} alt="" className="aspect-square w-full rounded-sm object-cover sm:w-40" />}
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-xl font-extrabold uppercase leading-tight">{luma.event.title}</h2>
            <p className="text-sm text-muted-foreground">{formatDate(luma.event.starts_at, locale)}</p>
            <a href={luma.event.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
              {luma.event.url}
            </a>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="lg" onClick={onConfirm} className="font-display text-[12px] font-extrabold uppercase tracking-[.04em]">
            <Check /> {t.confirm}
          </Button>
          <Link href={askPath(lp)} className="label text-muted-foreground hover:text-primary">
            {t.other}
          </Link>
        </div>
      </div>
    );
  }

  const refused = luma.state === 'error';
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-[52ch] text-muted-foreground">{t.intro}</p>
      <Form action={new_event_path(lp)} method="get" className="flex flex-wrap gap-3">
        {({ processing }) => (
          <>
            <Input name="luma" defaultValue={luma.url} placeholder={t.placeholder} aria-invalid={refused} className="h-11 min-w-0 flex-1 border-input bg-transparent px-3 text-base focus-visible:border-primary focus-visible:ring-0" />
            <Button type="submit" size="lg" disabled={processing} className="font-display text-[12px] font-extrabold uppercase tracking-[.04em]">
              {refused ? t.recheck : t.check}
            </Button>
          </>
        )}
      </Form>
      {refused && (
        <div role="alert" className="flex flex-col gap-4 rounded-sm border border-primary p-4">
          <p className="text-sm text-primary">{luma.message}</p>
          {(luma.error === 'not_host' || luma.error === 'private') && (
            <div className="flex flex-col gap-3 text-sm">
              <p className="text-muted-foreground">{t.steps}</p>
              <ol className="flex list-decimal flex-col gap-1 pl-5">
                <li>{t.stepPublic}</li>
                <li>
                  {t.stepHost(hostEmail)} <CopyEmail email={hostEmail} />
                </li>
              </ol>
              <img src="/luma/add-host.gif" alt={t.gifAlt} className="w-full rounded-sm border border-border" onError={(event) => (event.currentTarget.style.display = 'none')} />
            </div>
          )}
        </div>
      )}
      <Link href={new_event_path(lp)} className="label text-muted-foreground hover:text-primary">
        {t.scratch}
      </Link>
    </div>
  );
}

/** The imported event's own data, which the form does not ask for again. */
export function LumaSummary({ luma }: { luma: LumaImport }) {
  const { t, locale } = useI18n(COPY);
  if (!luma.event) return null;
  return (
    <div className="flex flex-col gap-2 rounded-sm border border-border p-4">
      <div className="label text-[11px] text-primary">{t.fromLuma}</div>
      <div className="flex gap-4">
        {luma.event.cover_url && <img src={luma.event.cover_url} alt="" className="size-20 rounded-sm object-cover" />}
        <div className="flex flex-col gap-1">
          <strong className="font-display uppercase leading-tight">{luma.event.title}</strong>
          <span className="text-sm text-muted-foreground">
            {formatDate(luma.event.starts_at, locale)} → {formatDate(luma.event.ends_at, locale)}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t.fromLumaNote}</p>
    </div>
  );
}
