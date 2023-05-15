/**
 * @module ol/proj/Units
 */

/**
 * @typedef {'radians' | 'degrees' | 'ft' | 'm' | 'pixels' | 'tile-pixels' | 'us-ft'} Units
 * Projection units.
 */
export type Units = 'radians' | 'degrees' | 'ft' | 'm' | 'pixels' | 'tile-pixels' | 'us-ft'

/**
 * See http://duff.ess.washington.edu/data/raster/drg/docs/geotiff.txt
 * @type {Object<number, Units>}
 */
const unitByCode: { [n: number]: Units; } = {
  '9001': 'm',
  '9002': 'ft',
  '9003': 'us-ft',
  '9101': 'radians',
  '9102': 'degrees',
};

/**
 * @param {number} code Unit code.
 * @return {Units} Units.
 */
export function fromCode(code: number): Units {
  return unitByCode[code];
}

/**
 * @typedef {Object} MetersPerUnitLookup
 * @property {number} radians Radians
 * @property {number} degrees Degrees
 * @property {number} ft  Feet
 * @property {number} m Meters
 * @property {number} us-ft US feetk
 */

/**
 * Meters per unit lookup table.
 * @const
 * @type {MetersPerUnitLookup}
 * @api
 */
export interface MetersPerUnitLookup {
  radians:number,
  degrees:number,
  ft:number,
  m:number,
  "us-ft":number,
  'tile-pixels':number,
  "pixels":number
}
export const METERS_PER_UNIT: MetersPerUnitLookup = {
  // use the radius of the Normal sphere
  'radians': 6370997 / (2 * Math.PI),
  'degrees': (2 * Math.PI * 6370997) / 360,
  'ft': 0.3048,
  'm': 1,
  'tile-pixels':1,
  'pixels':1,
  'us-ft': 1200 / 3937,
};
