import { describe, expect, it } from 'vitest';
import { placeOf, rank, typedNumberOf } from './address-input';

const feature = (properties: Record<string, string>, coordinates: [number, number] = [-70.61, -33.42]) => ({ geometry: { coordinates }, properties });

describe('placeOf', () => {
  it('names the venue, the street and number, and the commune', () => {
    expect(placeOf(feature({ type: 'house', name: 'WeWork', street: 'Avenida Apoquindo', housenumber: '5950', city: 'Las Condes', district: 'Las Condes', state: 'Región Metropolitana de Santiago' })))
      .toEqual({ address: 'WeWork, Avenida Apoquindo 5950, Las Condes', commune: 'Las Condes', latitude: -33.42, longitude: -70.61, region: 'Región Metropolitana de Santiago' });
  });
  it('takes the commune from the district where OSM files Greater Santiago under the city "Santiago"', () => {
    expect(placeOf(feature({ type: 'house', street: 'Avenida Los Pajaritos', housenumber: '2000', city: 'Santiago', district: 'Maipú' }))?.commune).toBe('Maipú');
    expect(placeOf(feature({ type: 'house', street: 'Moneda', housenumber: '1000', city: 'Santiago' }))?.commune).toBe('Santiago');
    expect(placeOf(feature({ type: 'house', street: 'Avenida Concha y Toro', housenumber: '1000', district: 'Puente Alto' }))?.commune).toBe('Puente Alto');
  });
  it('drops a building name that only repeats its street', () => {
    expect(placeOf(feature({ type: 'house', name: '21 de Mayo', street: '21 de Mayo', housenumber: '720', city: 'Arica' }))?.address).toBe('21 de Mayo 720, Arica');
  });
  it('keeps the city outside Santiago, where the district is a neighbourhood', () => {
    expect(placeOf(feature({ type: 'house', street: 'Blanco', housenumber: '951', city: 'Valparaíso', district: 'Almendral' }))?.address).toBe('Blanco 951, Valparaíso');
  });
  it('gives a street without that number mapped the number the host typed', () => {
    const street = feature({ type: 'street', name: 'Cerro Colorado', city: 'Santiago', district: 'Las Condes' });
    expect(placeOf(street, 'cerro colorado 4922 las condes')).toMatchObject({ address: 'Cerro Colorado 4922, Las Condes', approximate: true });
    expect(placeOf(feature({ type: 'house', name: 'Cerro Colorado 4700', street: 'Cerro Colorado', housenumber: '4700', city: 'Las Condes' }), 'cerro colorado 4922'))
      .toMatchObject({ address: 'Cerro Colorado 4700, Las Condes' });
    expect(placeOf(feature({ type: 'house', name: 'Cerro Colorado 4700', street: 'Cerro Colorado', housenumber: '4700', city: 'Las Condes' }))?.approximate).toBeUndefined();
  });
  it('accepts Camino Las Carretas 9930, whose number OSM does not have, with its commune and the street as the point', () => {
    const street = feature({ type: 'street', name: 'Camino Las Carretas', city: 'Lo Barnechea', state: 'Región Metropolitana de Santiago' }, [-70.5455596, -33.3332087]);
    expect(placeOf(street, 'Camino Las Carretas 9930, Lo Barnechea')).toEqual({
      address: 'Camino Las Carretas 9930, Lo Barnechea', commune: 'Lo Barnechea', latitude: -33.3332087, longitude: -70.5455596,
      region: 'Región Metropolitana de Santiago', approximate: true,
    });
  });
  it('finds the house number in what the host typed', () => {
    expect(typedNumberOf('cerro colorado 4922 las condes')).toBe('4922');
    expect(typedNumberOf('Av. Providencia 2124, Providencia')).toBe('2124');
    expect(typedNumberOf('wework apoquindo')).toBeUndefined();
    expect(typedNumberOf('21 de mayo 500 arica', '21 de Mayo')).toBe('500');
    expect(typedNumberOf('avenida 10 de julio', 'Avenida 10 de Julio')).toBeUndefined();
  });
  it('uses the name of a street result as its street, and drops results without a commune', () => {
    expect(placeOf(feature({ type: 'street', name: 'Avenida Providencia', city: 'Providencia' }))?.address).toBe('Avenida Providencia, Providencia');
    expect(placeOf(feature({ type: 'house', street: 'Ruta 5' }))).toBeNull();
  });
});

describe('rank', () => {
  const santiago21 = feature({ type: 'house', street: '21 de Mayo', housenumber: '500', city: 'Santiago' });
  const arica21 = feature({ type: 'street', name: '21 de Mayo', city: 'Arica' }, [-70.31, -18.48]);
  const lasCondes = feature({ type: 'street', name: 'Cerro Colorado', city: 'Santiago', district: 'Las Condes' });
  const iquique = feature({ type: 'street', name: 'Cerro Colorado', city: 'Iquique' }, [-70.14, -20.21]);

  it('puts first the places in a commune the host typed, even far from Santiago', () => {
    expect(rank('21 de mayo 500 arica', [santiago21, arica21], [arica21]).map((place) => place.address))
      .toEqual(['21 de Mayo 500, Arica', '21 de Mayo 500, Santiago']);
  });
  it('matches the commune without accents', () => {
    const concepcion = feature({ type: 'street', name: "O'Higgins", city: 'Concepción' });
    expect(rank("o'higgins 600 concepcion", [santiago21], [concepcion])[0].address).toBe("O'Higgins 600, Concepción");
  });
  it('puts the street the host named, from the numberless search, above loose matches that have the number', () => {
    const sofiaBarat = feature({ type: 'house', street: 'Santa Magdalena Sofía Barat', housenumber: '667', city: 'Santiago', district: 'Las Condes' });
    const pasajeSofia = feature({ type: 'house', street: 'Pasaje Sofia', housenumber: '667', city: 'Santiago', district: 'Maipú' });
    const soria = feature({ type: 'street', name: 'Soria', city: 'Santiago', district: 'Las Condes' });
    expect(rank('soria 667', [sofiaBarat, pasajeSofia], [pasajeSofia, sofiaBarat], [soria]).map((place) => place.address))
      .toEqual(['Soria 667, Las Condes', 'Santa Magdalena Sofía Barat 667, Las Condes', 'Pasaje Sofia 667, Maipú']);
  });
  it('matches the word still being typed as a prefix', () => {
    expect(rank('wework apoq', [], [feature({ type: 'house', name: 'WeWork', street: 'Avenida Apoquindo', housenumber: '5950', city: 'Las Condes' })])[0].address)
      .toBe('WeWork, Avenida Apoquindo 5950, Las Condes');
  });
  it('keeps the Santiago-leaning order when no commune is named', () => {
    expect(rank('cerro colorado 4922', [lasCondes], [iquique, lasCondes]).map((place) => place.commune)).toEqual(['Las Condes', 'Iquique']);
  });
});
