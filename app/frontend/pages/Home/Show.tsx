import { Head } from '@inertiajs/react';
import { type CSSProperties, useEffect } from 'react';
import { startFlock } from '@/flock';
import { startLogo } from '@/landing/logo';
import { startScene } from '@/landing/scene';
import { startTouchControls } from '@/landing/touch';
import type { HomeShow } from '@/types';

// The landing: the outline logo over the condor flying the real Chile relief, the page below
// it, and the game-mode UI the scene drives. Markup verbatim from the original index.html
// <body>; styles in stylesheets/landing.css; behaviour in landing/{logo,scene}.ts, which
// take over the DOM once this has mounted. The scene attaches its <canvas> to <body>
// itself, so nothing here re-renders while it runs.
const line = (i: number) => ({ '--i': i }) as CSSProperties;
// `&nbsp;` in the original markup.
const nb = '\u00A0';
// The original <svg title="…"> attribute; React's SVG prop types don't list `title`, so it is
// spread in rather than dropped.
const svgTitle = { title: 'Clic para repetir' };

// Vite's dev server re-mounts on HMR; the scene must never start twice in one document.
let started = false;

export default function Show({ title, description }: HomeShow) {
  useEffect(() => {
    if (started) return;
    started = true;
    startLogo();
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
        <a className="brand" href="/">
          CLTW<b>26</b>
        </a>
        <div className="label eyebrow">Santiago · 16 al 22 de noviembre</div>
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
        <p className="lede">Una semana. Cientos de eventos. Toda la comunidad tech de Chile.</p>
        <div className="cta">
          <a className="btn primary" href="#more">
            Inscríbete
          </a>
          <a className="btn" href="#more">
            Organiza un evento
          </a>
        </div>
        <button id="play" type="button">
          ▶ Vuela el cóndor <kbd>F</kbd>
        </button>
        <div id="flockcount" className="label" hidden />
      </section>

      <main id="more">
        <div className="label">16 al 22 de noviembre · Santiago</div>
        <h2>Una semana. Toda la ciudad.</h2>
        <p>
          Meetups, charlas, demos y fiestas organizados por la comunidad, en toda la ciudad.
          Cualquiera puede organizar un evento.
        </p>
        <div className="cta">
          <a className="btn" href="#">
            Organiza un evento
          </a>
        </div>
      </main>
      <footer className="label">
        <span>Chile Tech Week 2026</span>
        <span>#CTW2026</span>
        <a href="/brand/">Marca</a>
      </footer>

      <div id="gameui">
        <button id="exit" type="button">
          ✕
          <span className="lbl">
            {' '}
            salir {nb}
            <span style={{ opacity: 0.6 }}>Esc</span>
          </span>
        </button>
        <div id="joystick-base" aria-hidden="true">
          <div id="joystick-knob" />
        </div>
        <div id="help">
          <b>A / D</b> girar {nb} <b>W / S</b> subir / bajar {nb} <b>Shift</b> turbo
          <br />
          <b>Arrastrar</b> orbitar cámara {nb} <b>Rueda</b> velocidad {nb} <b>V</b>{' '}
          cámara libre {nb} <b>H</b> panel {nb} <b>R</b> reiniciar {nb}{' '}
          <b>Esc</b> salir
          <div className="hud" id="hud" />
          <div className="credit">
            Relieve: SRTM (AWS Terrain Tiles) · Cumbres: © OpenStreetMap contributors · Edificios y
            agua: Overture Maps · Mapa: Natural Earth
          </div>
        </div>
        <canvas id="minimap" aria-label="Mapa de Chile: clic para volar allí" title="Clic para volar allí" />
        <button id="search-btn" type="button" aria-label="Buscar ciudad o cumbre" title="Buscar ciudad o cumbre">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m20 20-4.8-4.8" />
          </svg>
        </button>
        <div id="search" hidden>
          <input id="search-input" type="search" placeholder="Ciudad o cumbre…" autoComplete="off" spellCheck={false} aria-label="Buscar ciudad o cumbre" />
          <ul id="search-results" role="listbox" />
        </div>
        {/* the pilot, top right: name and colour (click either to change), the nearest condors
            with the way to each (click a name to fly to their side), and everyone flying (the
            button opens the roster) */}
        <div id="pilot">
          <div className="row">
            <button id="pilot-color" type="button" aria-label="Cambiar color" title="Cambiar color" />
            <button id="pilot-name" type="button" title="Clic para cambiar tu nombre" />
          </div>
          <div id="pilot-swatches" hidden />
          <div id="pilot-msg" />
          <ul id="pilot-near" aria-label="Cóndores más cercanos" />
          <button id="pilot-all" type="button" aria-expanded="false" title="Ver a todos los cóndores">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m20 20-4.8-4.8" />
            </svg>
            <span id="pilot-count" />
          </button>
          <div id="roster" hidden>
            <input id="roster-input" type="search" placeholder="Buscar cóndor…" autoComplete="off" spellCheck={false} aria-label="Buscar cóndor" />
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
