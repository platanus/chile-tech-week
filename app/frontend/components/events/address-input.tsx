import { MapPin } from 'lucide-react';
import { type KeyboardEvent, useEffect, useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// The venue, searched as the host types and picked from a list: Photon (komoot's geocoder
// over OpenStreetMap — free, no key, built for search-as-you-type), limited to Chile and
// leaning towards Santiago. Picking a result fills the hidden fields the server stores:
// the address as shown, its commune and its coordinates. Text that was not picked from the
// list posts no address, so the commune always comes from a real place.

const PHOTON_URL = 'https://photon.komoot.io/api/';

export type Place = { address: string; commune: string; latitude: number; longitude: number };
// `approximate`: OSM knows the street but not the number the host typed, so the address
// carries their number and the pin sits on the street.
type Suggestion = Place & { region?: string; approximate?: boolean };

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: { type?: string; name?: string; street?: string; housenumber?: string; city?: string; district?: string; state?: string };
};

// OSM files most of Greater Santiago's streets under the city "Santiago" and puts the actual
// commune (Maipú, Quilicura…) in `district`; elsewhere `city` is the commune and `district`
// a neighbourhood (Playa Ancha, in Valparaíso).
export function communeOf({ city, district }: PhotonFeature['properties']) {
  if (city === 'Santiago') return district || city;
  return city || district;
}

// The house number in what the host typed ("cerro colorado 4922 las condes" → "4922"): the
// last number that is not part of the street's own name, since so many Chilean streets are
// dates ("21 de Mayo 500" → "500", not "21").
export function typedNumberOf(query: string, streetName = '') {
  const inName = new Set(streetName.match(/\d+[a-z]?/gi) ?? []);
  const numbers = [...query.matchAll(/(?:^|\s)(\d{1,5}[a-z]?)(?=\s|,|$)/gi)].map((match) => match[1]);
  return numbers.filter((number) => !inName.has(number)).at(-1);
}

// Only the numbers somebody mapped exist in OSM — most of Santiago has a handful per street —
// so a bare street result takes the number the host typed.
export function placeOf(feature: PhotonFeature, query = ''): Suggestion | null {
  const p = feature.properties;
  const commune = communeOf(p);
  const typedNumber = p.type === 'street' && !p.housenumber ? typedNumberOf(query, p.name) : undefined;
  const approximate = p.type === 'street' && !p.housenumber && !!typedNumber;
  const street = p.street
    ? [p.street, p.housenumber].filter(Boolean).join(' ')
    : p.type === 'street' ? [p.name, approximate ? typedNumber : undefined].filter(Boolean).join(' ') : undefined;
  // A building OSM names after its own street ("21 de Mayo" at 21 de Mayo 720) adds nothing.
  const name = p.name && p.type !== 'street' && !street?.startsWith(p.name) ? p.name : undefined;
  const line = [name, street].filter(Boolean).join(', ');
  if (!commune || !line) return null;
  const [longitude, latitude] = feature.geometry.coordinates;
  return { address: `${line}, ${commune}`, commune, latitude, longitude, region: p.state, ...(approximate && { approximate }) };
}

// Photon's results for one query, as the form's suggestions.
async function photon(query: string, signal: AbortSignal, nearSantiago: boolean) {
  // lang=default: the names as mapped (Spanish), not in the browser's language.
  const params = new URLSearchParams({ q: query, limit: '8', countrycode: 'CL', lang: 'default' });
  if (nearSantiago) {
    params.set('lat', '-33.44');
    params.set('lon', '-70.65');
  }
  params.append('layer', 'house');
  params.append('layer', 'street');
  const response = await fetch(`${PHOTON_URL}?${params}`, { signal });
  if (!response.ok) throw new Error(`Photon ${response.status}`);
  const { features } = (await response.json()) as { features: PhotonFeature[] };
  return features;
}

const fold = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// Whether the host named this place's commune ("… Arica", "… concepcion").
function namesCommune(query: string, place: Place) {
  return new RegExp(`(^|[^a-z])${fold(place.commune).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z])`).test(fold(query));
}

const words = (text: string): string[] => fold(text).match(/[a-z0-9]+/g) ?? [];

// Whether every word the host typed (the number aside) is in the result — "soria" in
// "Soria 667, Las Condes", yes; in "Santa Magdalena Sofía Barat 667", no. Photon matches
// loosely, and a loose match must not outrank the street the host actually named. The word
// still being typed counts as a prefix.
function matchesWords(query: string, place: Place) {
  const typed = words(query).filter((word) => !/^\d/.test(word) && word.length > 1);
  const found = words(place.address);
  return typed.every((word, index) =>
    index === typed.length - 1 ? found.some((candidate) => candidate.startsWith(word)) : found.includes(word));
}

// Most events are in Santiago, so a bare "Cerro Colorado 4922" should find Las Condes before
// Iquique; but the Santiago bias alone buries "21 de Mayo 500 Arica" under Santiago's own
// 21 de Mayo. So ask both ways, and without the house number too: given one, Photon prefers
// any street that has it mapped ("Sofía 667") over the named street without it ("Soria").
// Then rank what sits in a commune the host typed, then what matches every typed word, each
// tier in the Santiago-leaning order.
export function rank(query: string, ...responses: PhotonFeature[][]) {
  const places = responses.flat().flatMap((feature) => placeOf(feature, query) ?? []);
  const score = (place: Place) => (namesCommune(query, place) ? 2 : 0) + (matchesWords(query, place) ? 1 : 0);
  const ordered = places.map((place, index) => ({ place, index }))
    .sort((a, b) => score(b.place) - score(a.place) || a.index - b.index)
    .map(({ place }) => place);
  // A mapped number beats the same address guessed from its street; then one of each.
  const exact = new Set(ordered.filter((place) => !place.approximate).map((place) => place.address));
  const seen = new Set<string>();
  return ordered.filter((place) => {
    if (seen.has(place.address) || (place.approximate && exact.has(place.address))) return false;
    seen.add(place.address);
    return true;
  }).slice(0, 8);
}

async function search(query: string, signal: AbortSignal) {
  const number = typedNumberOf(query);
  const withoutNumber = number ? query.replace(new RegExp(`(^|\\s)${number}(?=\\s|,|$)`), ' ').trim() : '';
  const [nearSantiago, anywhere, street] = await Promise.all([
    photon(query, signal, true),
    photon(query, signal, false),
    withoutNumber ? photon(withoutNumber, signal, true) : Promise.resolve<PhotonFeature[]>([]),
  ]);
  return rank(query, nearSantiago, anywhere, street);
}

export function AddressInput({ id, prefix, initial, placeholder = 'Busca la dirección del evento', className, onPick, ...aria }: {
  id: string;
  // The form's param prefix: the hidden fields post as `${prefix}[address]` and so on.
  prefix: string;
  initial?: Partial<Place>;
  placeholder?: string;
  className?: string;
  // The hidden fields change without a DOM event a form would hear: this is the signal.
  onPick?: (place: Place | null) => void;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}) {
  const [query, setQuery] = useState(initial?.address ?? '');
  const [picked, setPicked] = useState<Partial<Place> | null>(initial?.commune ? initial : null);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState(false);
  const listId = useId();

  useEffect(() => {
    const text = query.trim();
    if (text.length < 3 || text === picked?.address) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      search(text, controller.signal)
        .then((places) => { setResults(places); setActive(0); setFailed(false); })
        .catch((error) => { if (error.name !== 'AbortError') setFailed(true); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, picked?.address]);

  const pick = (place: Place) => {
    setPicked(place);
    setQuery(place.address);
    setOpen(false);
    onPick?.(place);
  };

  const onType = (value: string) => {
    setQuery(value);
    setOpen(true);
    if (picked && value !== picked.address) {
      setPicked(null);
      onPick?.(null);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => (i + 1) % results.length); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => (i - 1 + results.length) % results.length); }
    else if (event.key === 'Enter') { event.preventDefault(); pick(results[active]); }
    else if (event.key === 'Escape') setOpen(false);
  };

  const showList = open && (results.length > 0 || failed);

  return (
    <div className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        onChange={(event) => onType(event.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          // Editing a saved place and leaving without picking another keeps the saved one.
          if (!picked && initial?.commune) {
            setPicked(initial);
            setQuery(initial.address ?? '');
          }
        }}
        onKeyDown={onKeyDown}
        className={className}
        {...aria}
      />
      <input type="hidden" name={`${prefix}[address]`} value={picked?.address ?? ''} />
      <input type="hidden" name={`${prefix}[commune]`} value={picked?.commune ?? ''} />
      <input type="hidden" name={`${prefix}[latitude]`} value={picked?.latitude ?? ''} />
      <input type="hidden" name={`${prefix}[longitude]`} value={picked?.longitude ?? ''} />
      {showList && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-sm border border-border bg-popover py-1 text-popover-foreground shadow-md">
          {results.map((place, index) => (
            <li
              key={place.address}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              // mousedown, not click: it lands before the input's blur closes the list.
              onMouseDown={(event) => { event.preventDefault(); pick(place); }}
              onMouseEnter={() => setActive(index)}
              className={cn('flex cursor-pointer items-start gap-2 px-3 py-2 text-sm', index === active && 'bg-accent text-accent-foreground')}
            >
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="flex flex-col">
                <span>{place.address}</span>
                {place.region && <span className="text-xs text-muted-foreground">{place.region}</span>}
              </span>
            </li>
          ))}
          {failed && results.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">No pudimos buscar direcciones. Intenta de nuevo.</li>}
          <li className="px-3 pt-1 text-[10px] text-muted-foreground">Direcciones de © OpenStreetMap</li>
        </ul>
      )}
    </div>
  );
}
