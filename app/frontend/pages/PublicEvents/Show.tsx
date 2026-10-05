import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowUpRight, Globe, MapPin } from 'lucide-react';
import { formatLongDay, formatTime, localDate, TIME_ZONE } from '@/components/events/dates';
import { copy, useI18n } from '@/lib/i18n';
import { events_path } from '@/routes';
import type { PublicEventsShow } from '@/types';
import '@/stylesheets/public-event.css';

// The event's own words (title, description, organizers) are the host's, in whatever language
// they wrote them; only the page around them changes with /en.
const COPY = copy(
  {
    back: 'Todos los eventos',
    aside: 'Portada y organizadores',
    cover: (title: string) => `Portada de ${title}`,
    website: (company: string) => `Sitio web de ${company}`,
    hostedBy: 'Organizado por',
    luma: 'Página de Luma',
    topics: 'Temas',
    register: 'Inscribirse',
    about: 'Acerca del evento',
  },
  {
    back: 'All events',
    aside: 'Cover and hosts',
    cover: (title: string) => `Cover of ${title}`,
    website: (company: string) => `${company}'s website`,
    hostedBy: 'Hosted by',
    luma: 'Luma page',
    topics: 'Topics',
    register: 'Register',
    about: 'About the event',
  },
);

function OrganizerIcon({ src, name }: { src?: string | null; name: string }) {
  return src
    ? <img className="event-organizer-icon" src={src} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
    : <span className="event-organizer-icon event-organizer-initial" aria-hidden="true">{name.charAt(0)}</span>;
}

export default function Show({ title, description, opengraphImageUrl, event }: PublicEventsShow) {
  const { t, locale, lp } = useI18n(COPY);
  const tag = locale === 'en' ? 'en-US' : 'es-CL';
  const starts = new Date(event.startsAt);
  const month = new Intl.DateTimeFormat(tag, { month: 'short', timeZone: TIME_ZONE }).format(starts).replace('.', '');
  const date = new Intl.DateTimeFormat(tag, { day: 'numeric', timeZone: TIME_ZONE }).format(starts);
  const zone = new Intl.DateTimeFormat(tag, { timeZone: TIME_ZONE, timeZoneName: 'shortOffset' })
    .formatToParts(starts).find((part) => part.type === 'timeZoneName')?.value;
  const sameDay = localDate(event.startsAt) === localDate(event.endsAt);

  return (
    <div className="public-event mx-auto max-w-6xl px-[6vw] py-12 md:px-8">
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={event.title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={opengraphImageUrl} />
      </Head>
      <Link href={events_path(lp)} className="event-back"><ArrowLeft size={15} />{t.back}</Link>
      <div className="event-detail-grid">
        <aside className="event-sidebar" aria-label={t.aside}>
          <div className="event-cover">
            {event.coverImageUrl
              ? <img src={event.coverImageUrl} alt={t.cover(event.title)} fetchPriority="high" />
              : <div className="event-cover-fallback"><img src="/brand/logo-transparent.svg" alt="Chile Tech Week" /></div>}
          </div>
          <p className="event-summary">{event.description}</p>
          <a className="event-website" href={event.companyWebsite} target="_blank" rel="noopener noreferrer" aria-label={t.website(event.companyName)}><Globe size={21} /></a>
          <section className="event-organizers" aria-labelledby="organizers-heading">
            <h2 id="organizers-heading">{t.hostedBy}</h2>
            <a href={event.companyWebsite} target="_blank" rel="noopener noreferrer" className="event-organizer-row">
              <OrganizerIcon src={event.companyLogoUrl} name={event.companyName} /><span>{event.companyName}</span><ArrowUpRight size={19} />
            </a>
            {event.cohosts.map((host) => <div className="event-organizer-row" key={host.id}><OrganizerIcon src={host.companyLogoUrl} name={host.companyName} /><span>{host.companyName}</span></div>)}
          </section>
          {event.lumaEventUrl && <a className="event-external-link" href={event.lumaEventUrl} target="_blank" rel="noopener noreferrer">{t.luma}<ArrowUpRight size={17} /></a>}
          <div className="event-tags" aria-label={t.topics}>{event.themes.map((theme) => <span key={theme.id}># {theme.name}</span>)}</div>
        </aside>

        <article className="event-content">
          <h1>{event.title}</h1>
          <div className="event-facts">
            <div className="event-fact">
              <div className="event-date-icon" aria-hidden="true"><span>{month}</span><strong>{date}</strong></div>
              <div><p className="event-fact-title"><time dateTime={event.startsAt}>{formatLongDay(event.startsAt, locale)}</time></p><p className="event-fact-detail">{formatTime(event.startsAt)} – {sameDay ? '' : `${formatLongDay(event.endsAt, locale)}, `}{formatTime(event.endsAt)} <span>{zone} · Santiago</span></p></div>
            </div>
            <div className="event-fact">
              <div className="event-location-icon"><MapPin size={27} aria-hidden="true" /></div>
              <div><p className="event-fact-title">{event.commune}</p><p className="event-fact-detail">{event.address ?? 'Chile'}</p></div>
            </div>
          </div>
          {event.lumaEventUrl && (
            <a className="event-register" href={event.lumaEventUrl} target="_blank" rel="noopener noreferrer">
              {t.register}<ArrowUpRight size={18} aria-hidden="true" />
            </a>
          )}
          <section className="event-about" aria-labelledby="about-heading">
            <h2 id="about-heading">{t.about}</h2>
            <div className="event-markdown" dangerouslySetInnerHTML={{ __html: event.bodyHtml }} />
          </section>
        </article>
      </div>
    </div>
  );
}
