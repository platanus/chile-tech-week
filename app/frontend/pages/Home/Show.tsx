import { Head } from '@inertiajs/react';
import { type CSSProperties, useEffect } from 'react';
import { FaqSection } from '@/components/landing/faq-section';
import { OrganizersSection } from '@/components/landing/organizers-section';
import { LocaleSuggestion, LocaleSwitch } from '@/components/site/locale-switch';
import { startExit } from '@/landing/exit';
import { startFlock } from '@/flock';
import { startLogo } from '@/landing/logo';
import { startScene } from '@/landing/scene';
import { startTouchControls } from '@/landing/touch';
import { copy, useI18n } from '@/lib/i18n';
import { events_path, new_event_path } from '@/routes';
import type { HomeShow } from '@/types';

// The landing: the outline logo over the condor flying the real Chile relief, the page below
// it, and the game-mode UI the scene drives. Markup verbatim from the original index.html
// <body>; styles in stylesheets/landing.css; behaviour in landing/{logo,scene}.ts, which
// take over the DOM once this has mounted. The scene attaches its <canvas> to <body>
// itself, so nothing here re-renders while it runs.
const line = (i: number) => ({ '--i': i }) as CSSProperties;
// `&nbsp;` in the original markup.
const nb = '\u00A0';

const COPY = copy(
  {
    replay: 'Clic para repetir',
    lede: 'La semana descentralizada con los mejores eventos tech del país.',
    datesLabel: '16 al 22 de noviembre de 2026',
    month: 'noviembre 2026',
    seeEvents: 'Ver eventos',
    host: 'Organiza un evento',
    fly: 'Vuela el cóndor',
    brand: 'Marca',
    exit: 'salir',
    turbo: 'turbo',
    minimap: 'Mapa de Chile: clic para volar allí',
    minimapTitle: 'Clic para volar allí',
    search: 'Buscar ciudad o cumbre',
    searchPlaceholder: 'Ciudad o cumbre…',
    color: 'Cambiar color',
    rename: 'Clic para cambiar tu nombre',
    nearest: 'Cóndores más cercanos',
    everyone: 'Ver a todos los cóndores',
    roster: 'Buscar cóndor',
    rosterPlaceholder: 'Buscar cóndor…',
  },
  {
    replay: 'Click to replay',
    lede: "The decentralized week with Chile's best tech events.",
    datesLabel: 'November 16 to 22, 2026',
    month: 'November 2026',
    seeEvents: 'See events',
    host: 'Host an event',
    fly: 'Fly the condor',
    brand: 'Brand',
    exit: 'exit',
    turbo: 'boost',
    minimap: 'Map of Chile: click to fly there',
    minimapTitle: 'Click to fly there',
    search: 'Search for a city or peak',
    searchPlaceholder: 'City or peak…',
    color: 'Change colour',
    rename: 'Click to change your name',
    nearest: 'Nearest condors',
    everyone: 'See every condor',
    roster: 'Search for a condor',
    rosterPlaceholder: 'Search for a condor…',
  },
);

// Vite's dev server re-mounts on HMR; the scene must never start twice in one document.
let started = false;

export default function Show({ title, description }: HomeShow) {
  const { t, lp } = useI18n(COPY);
  // The original <svg title="…"> attribute; React's SVG prop types don't list `title`, so it
  // is spread in rather than dropped.
  const svgTitle = { title: t.replay };
  useEffect(() => {
    if (started) return;
    started = true;
    startLogo();
    startExit();
    void startScene();
    startFlock(); // the scene installs its hooks synchronously, before its first await
    startTouchControls();
  }, []);

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Head>

      <div id="veil" />

      <section id="hero">
        <LocaleSwitch exit className="landing-locale" />
        <svg
          className="logo"
          id="logo"
          viewBox="0 0 374 370"
          role="img"
          aria-label="Chile Tech Week 2026"
          {...svgTitle}
        >
          <defs>
            <mask id="hollow20" maskUnits="userSpaceOnUse" x="-40" y="-40" width="600" height="460">
              <rect x="-40" y="-40" width="600" height="460" fill="#fff" />
              <text x="0" y="360" fontSize="100">
                <tspan fill="#000">20</tspan>
                <tspan fill="#fff">26</tspan>
              </text>
            </mask>
          </defs>
          <text x="0" y="90" fontSize="100" style={line(0)}>
            CHILE
          </text>
          <text x="0" y="180" fontSize="100" style={line(1)}>
            TECH
          </text>
          <text x="0" y="270" fontSize="100" style={line(2)}>
            WEEK
          </text>
          <text x="0" y="360" fontSize="100" style={line(3)} mask="url(#hollow20)">
            <tspan className="y20">20</tspan>
            <tspan className="y26">26</tspan>
          </text>
        </svg>
        <p className="lede">{t.lede}</p>
        {/* the dates, the one fact a visitor must leave with: the display face, the days in red */}
        <div className="dates" aria-label={t.datesLabel}>
          <span className="days">
            <b>16</b>
            <i>—</i>
            <b>22</b>
          </span>
          <span className="month">{t.month}</span>
        </div>
        <div className="cta">
          {/* plain anchors with data-exit: landing/exit.ts fades to black and hands the
              document over, so the scene dies with it (see the module for why) */}
          <a className="btn primary" href={events_path(lp)} data-exit>
            {t.seeEvents}
          </a>
          <a className="btn" href={new_event_path(lp)} data-exit>
            {t.host}
          </a>
        </div>
        <button id="play" type="button">
          ▶ {t.fly} <kbd>F</kbd>
        </button>
        <div id="flockcount" className="label" hidden />
      </section>

      <main id="more">
        <OrganizersSection />
        <FaqSection />
      </main>
      <footer className="label landing-footer">
        <span>Chile Tech Week 2026</span>
        <img className="footer-logo" src="/brand/logo-horizontal-transparent.svg" alt="Chile Tech Week 2026" width="1367" height="138" loading="lazy" />
        <span className="landing-footer-end">
          <LocaleSwitch exit />
          <a href="/brand/" data-exit>
            {t.brand}
          </a>
        </span>
      </footer>
      <LocaleSuggestion exit />

      <div id="gameui">
        <button id="exit" type="button">
          ✕
          <span className="lbl">
            {' '}
            {t.exit} {nb}
            <span style={{ opacity: 0.6 }}>Esc</span>
          </span>
        </button>
        <div id="throttle" aria-hidden="true">
          <span className="cap">{t.turbo}</span>
          <div className="track">
            <div className="fill" />
            <div className="knob" />
          </div>
        </div>
        <div id="joystick-base" aria-hidden="true">
          <div id="joystick-knob" />
        </div>
        {import.meta.env.DEV && (
          <div id="help">
            <b>A / D</b> girar {nb} <b>W / S</b> subir / bajar {nb} <b>Shift</b> turbo
            <br />
            <b>Arrastrar</b> orbitar cámara {nb} <b>Rueda</b> velocidad {nb} <b>V</b>{' '}
            cámara libre {nb} <b>H</b> panel {nb} <b>J</b> mostrar / ocultar ayuda {nb} <b>R</b> reiniciar {nb}{' '}
            <b>Esc</b> salir
            <div className="hud" id="hud" />
            <div className="credit">
              Relieve: SRTM (AWS Terrain Tiles) · Cumbres: © OpenStreetMap contributors · Edificios y
              agua: Overture Maps · Mapa: Natural Earth
            </div>
          </div>
        )}
        <canvas id="minimap" aria-label={t.minimap} title={t.minimapTitle} />
        <button id="search-btn" type="button" aria-label={t.search} title={t.search}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m20 20-4.8-4.8" />
          </svg>
        </button>
        <div id="search" hidden>
          <input id="search-input" type="search" placeholder={t.searchPlaceholder} autoComplete="off" spellCheck={false} aria-label={t.search} />
          <ul id="search-results" role="listbox" />
        </div>
        {/* the pilot, top right: name and colour (click either to change), the nearest condors
            with the way to each (click a name to fly to their side), and everyone flying (the
            button opens the roster) */}
        <div id="pilot">
          <div className="row">
            <button id="pilot-color" type="button" aria-label={t.color} title={t.color} />
            <button id="pilot-name" type="button" title={t.rename} />
          </div>
          <div id="pilot-swatches" hidden />
          <div id="pilot-msg" />
          <ul id="pilot-near" aria-label={t.nearest} />
          <button id="pilot-all" type="button" aria-expanded="false" title={t.everyone}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m20 20-4.8-4.8" />
            </svg>
            <span id="pilot-count" />
          </button>
          <div id="roster" hidden>
            <input id="roster-input" type="search" placeholder={t.rosterPlaceholder} autoComplete="off" spellCheck={false} aria-label={t.roster} />
            <ul id="roster-list" role="listbox" />
            <div id="roster-foot" />
          </div>
        </div>
      </div>
      <div id="peaks" aria-hidden="true" />
      <div id="scan" />
      <div id="toast" />
      <div id="fade" />
    </>
  );
}
