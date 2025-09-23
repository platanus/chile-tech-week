export const SANTIAGO_COMMUNES = [
  // Most common for tech events
  'Providencia',
  'Las Condes',
  'Vitacura',
  'Ñuñoa',
  'Santiago',

  // Other central communes
  'Recoleta',
  'Independencia',
  'Conchalí',
  'Huechuraba',
  'Quilicura',

  // Eastern communes
  'La Reina',
  'Peñalolén',
  'Macul',
  'San Joaquín',
  'La Granja',
  'La Pintana',
  'San Ramón',
  'El Bosque',
  'La Cisterna',
  'San Miguel',
  'Pedro Aguirre Cerda',
  'Lo Espejo',

  // Western communes
  'Quinta Normal',
  'Estación Central',
  'Cerrillos',
  'Maipú',
  'Pudahuel',
  'Lo Prado',
  'Cerro Navia',
  'Renca',

  // Southern communes
  'San Bernardo',
  'Puente Alto',
  'La Florida',
  'Pirque',
  'Calera de Tango',
  'Buin',
  'Paine',
] as const;

export type SantiagoCommune = (typeof SANTIAGO_COMMUNES)[number];
