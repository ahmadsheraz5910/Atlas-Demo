/**
 * @module ol/format/Feature
 */
import {abstract} from '../../util.js';
import {
  equivalent as equivalentProjection,
  get as getProjection,
  transformExtent,
} from '../../proj.js';

/**
 * @typedef {Object} ReadOptions
 * @property {import("../proj.js").ProjectionLike} [dataProjection] Projection of the data we are reading.
 * If not provided, the projection will be derived from the data (where possible) or
 * the `dataProjection` of the format is assigned (where set). If the projection
 * can not be derived from the data and if no `dataProjection` is set for a format,
 * the features will not be reprojected.
 * @property {import("../extent.js").Extent} [extent] Tile extent in map units of the tile being read.
 * This is only required when reading data with tile pixels as geometry units. When configured,
 * a `dataProjection` with `TILE_PIXELS` as `units` and the tile's pixel extent as `extent` needs to be
 * provided.
 * @property {import("../proj.js").ProjectionLike} [featureProjection] Projection of the feature geometries
 * created by the format reader. If not provided, features will be returned in the
 * `dataProjection`.
 */


/**
 * @typedef {'arraybuffer' | 'json' | 'text' | 'xml'} Type
 */

/**
 * @classdesc
 * Abstract base class; normally only used for creating subclasses and not
 * instantiated in apps.
 * Base class for feature formats.
 * {@link module:ol/format/Feature~FeatureFormat} subclasses provide the ability to decode and encode
 * {@link module:ol/Feature~Feature} objects from a variety of commonly used geospatial
 * file formats.  See the documentation for each format for more details.
 *
 * @abstract
 * @api
 */
class FeatureFormat {
  constructor() {
    /**
     * @protected
     * @type {import("../proj/Projection.js").default|undefined}
     */
    this.dataProjection = undefined;

    /**
     * @protected
     * @type {import("../proj/Projection.js").default|undefined}
     */
    this.defaultFeatureProjection = undefined;

    /**
     * A list media types supported by the format in descending order of preference.
     * @type {Array<string>}
     */
    this.supportedMediaTypes = null;
  }

  /**
   * Adds the data projection to the read options.
   * @param {Document|Element|Object|string} source Source.
   * @param {ReadOptions} [options] Options.
   * @return {ReadOptions|undefined} Options.
   * @protected
   */
  getReadOptions(source, options) {
    if (options) {
      let dataProjection = options.dataProjection
        ? getProjection(options.dataProjection)
        : this.readProjection(source);
      if (
        options.extent &&
        dataProjection &&
        dataProjection.getUnits() === 'tile-pixels'
      ) {
        dataProjection = getProjection(dataProjection);
        dataProjection.setWorldExtent(options.extent);
      }
      options = {
        dataProjection: dataProjection,
        featureProjection: options.featureProjection,
      };
    }
    return this.adaptOptions(options);
  }

  /**
   * Sets the `dataProjection` on the options, if no `dataProjection`
   * is set.
   * @param {WriteOptions|ReadOptions|undefined} options
   *     Options.
   * @protected
   * @return {WriteOptions|ReadOptions|undefined}
   *     Updated options.
   */
  adaptOptions(options) {
    return Object.assign(
      {
        dataProjection: this.dataProjection,
        featureProjection: this.defaultFeatureProjection,
      },
      options
    );
  }

  /**
   * @abstract
   * @return {Type} The format type.
   */
  getType() {
    return abstract();
  }

  /**
   * Read a single feature from a source.
   *
   * @abstract
   * @param {Document|Element|Object|string} source Source.
   * @param {ReadOptions} [options] Read options.
   * @return {import("../Feature.js").FeatureLike} Feature.
   */
  readFeature(source, options) {
    return abstract();
  }

  /**
   * Read all features from a source.
   *
   * @abstract
   * @param {Document|Element|ArrayBuffer|Object|string} source Source.
   * @param {ReadOptions} [options] Read options.
   * @return {Array<import("../Feature.js").FeatureLike>} Features.
   */
  readFeatures(source, options) {
    return abstract();
  }

  /**
   * Read a single geometry from a source.
   *
   * @abstract
   * @param {Document|Element|Object|string} source Source.
   * @param {ReadOptions} [options] Read options.
   * @return {import("../geom/Geometry.js").default} Geometry.
   */
  readGeometry(source, options) {
    return abstract();
  }

  /**
   * Read the projection from a source.
   *
   * @abstract
   * @param {Document|Element|Object|string} source Source.
   * @return {import("../proj/Projection.js").default|undefined} Projection.
   */
  readProjection(source) {
    return abstract();
  }

}

export default FeatureFormat;

/**
 * @param {import("../geom/Geometry.js").default} geometry Geometry.
 * @param {boolean} write Set to true for writing, false for reading.
 * @param {WriteOptions|ReadOptions} [options] Options.
 * @return {import("../geom/Geometry.js").default} Transformed geometry.
 */
export function transformGeometryWithOptions(geometry, write, options) {
  const featureProjection = options
    ? getProjection(options.featureProjection)
    : null;
  const dataProjection = options ? getProjection(options.dataProjection) : null;

  let transformed;
  if (
    featureProjection &&
    dataProjection &&
    !equivalentProjection(featureProjection, dataProjection)
  ) {
    transformed = (write ? geometry.clone() : geometry).transform(
      write ? featureProjection : dataProjection,
      write ? dataProjection : featureProjection
    );
  } else {
    transformed = geometry;
  }
  if (
    write &&
    options &&
    /** @type {WriteOptions} */ (options).decimals !== undefined
  ) {
    const power = Math.pow(10, /** @type {WriteOptions} */ (options).decimals);
    // if decimals option on write, round each coordinate appropriately
    /**
     * @param {Array<number>} coordinates Coordinates.
     * @return {Array<number>} Transformed coordinates.
     */
    const transform = function (coordinates) {
      for (let i = 0, ii = coordinates.length; i < ii; ++i) {
        coordinates[i] = Math.round(coordinates[i] * power) / power;
      }
      return coordinates;
    };
    if (transformed === geometry) {
      transformed = geometry.clone();
    }
    transformed.applyTransform(transform);
  }
  return transformed;
}

/**
 * @param {import("../extent.js").Extent} extent Extent.
 * @param {ReadOptions} [options] Read options.
 * @return {import("../extent.js").Extent} Transformed extent.
 */
export function transformExtentWithOptions(extent, options) {
  const featureProjection = options
    ? getProjection(options.featureProjection)
    : null;
  const dataProjection = options ? getProjection(options.dataProjection) : null;

  if (
    featureProjection &&
    dataProjection &&
    !equivalentProjection(featureProjection, dataProjection)
  ) {
    return transformExtent(extent, dataProjection, featureProjection);
  }
  return extent;
}
