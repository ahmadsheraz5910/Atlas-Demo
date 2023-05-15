/**
 * @module ol/format/GML2
 */
import GMLBase, {GMLNS} from './base/GMLBase.js';
import {
  getAllTextContent,
  makeArrayPusher,
  makeReplacer,
  pushParseAndPop,
} from '../xml.js';
import {createOrUpdate} from '../extent.js';
import {get as getProjection} from '../proj.js';

/**
 * @const
 * @type {string}
 */
const schemaLocation =
  GMLNS + ' http://schemas.opengis.net/gml/2.1.2/feature.xsd';

/**
 * @const
 * @type {Object<string, string>}
 */
const MULTIGEOMETRY_TO_MEMBER_NODENAME = {
  'MultiLineString': 'lineStringMember',
  'MultiCurve': 'curveMember',
  'MultiPolygon': 'polygonMember',
  'MultiSurface': 'surfaceMember',
};

/**
 * @classdesc
 * Feature format for reading and writing data in the GML format,
 * version 2.1.2.
 *
 * @api
 */
class GML2 extends GMLBase {
  /**
   * @param {import("./base/GMLBase.js").Options} [options] Optional configuration object.
   */
  constructor(options) {
    options = options ? options : {};

    super(options);

    this.FEATURE_COLLECTION_PARSERS[GMLNS]['featureMember'] = makeArrayPusher(
      this.readFeaturesInternal
    );

    /**
     * @type {string}
     */
    this.schemaLocation = options.schemaLocation
      ? options.schemaLocation
      : schemaLocation;
  }

  /**
   * @param {Node} node Node.
   * @param {Array<*>} objectStack Object stack.
   * @return {Array<number>|undefined} Flat coordinates.
   */
  readFlatCoordinates(node, objectStack) {
    const s = getAllTextContent(node, false).replace(/^\s*|\s*$/g, '');
    const context = /** @type {import("../xml.js").NodeStackItem} */ (
      objectStack[0]
    );
    const containerSrs = context['srsName'];
    let axisOrientation = 'enu';
    if (containerSrs) {
      const proj = getProjection(containerSrs);
      if (proj) {
        axisOrientation = proj.getAxisOrientation();
      }
    }
    const coordsGroups = s.trim().split(/\s+/);
    const flatCoordinates = [];
    for (let i = 0, ii = coordsGroups.length; i < ii; i++) {
      const coords = coordsGroups[i].split(/,+/);
      const x = parseFloat(coords[0]);
      const y = parseFloat(coords[1]);
      const z = coords.length === 3 ? parseFloat(coords[2]) : 0;
      if (axisOrientation.substr(0, 2) === 'en') {
        flatCoordinates.push(x, y, z);
      } else {
        flatCoordinates.push(y, x, z);
      }
    }
    return flatCoordinates;
  }

  /**
   * @param {Element} node Node.
   * @param {Array<*>} objectStack Object stack.
   * @return {import("../extent.js").Extent|undefined} Envelope.
   */
  readBox(node, objectStack) {
    /** @type {Array<number>} */
    const flatCoordinates = pushParseAndPop(
      [null],
      this.BOX_PARSERS_,
      node,
      objectStack,
      this
    );
    return createOrUpdate(
      flatCoordinates[1][0],
      flatCoordinates[1][1],
      flatCoordinates[1][3],
      flatCoordinates[1][4]
    );
  }

  /**
   * @param {Element} node Node.
   * @param {Array<*>} objectStack Object stack.
   */
  innerBoundaryIsParser(node, objectStack) {
    /** @type {Array<number>|undefined} */
    const flatLinearRing = pushParseAndPop(
      undefined,
      this.RING_PARSERS,
      node,
      objectStack,
      this
    );
    if (flatLinearRing) {
      const flatLinearRings =
        /** @type {Array<Array<number>>} */
        (objectStack[objectStack.length - 1]);
      flatLinearRings.push(flatLinearRing);
    }
  }

  /**
   * @param {Element} node Node.
   * @param {Array<*>} objectStack Object stack.
   */
  outerBoundaryIsParser(node, objectStack) {
    /** @type {Array<number>|undefined} */
    const flatLinearRing = pushParseAndPop(
      undefined,
      this.RING_PARSERS,
      node,
      objectStack,
      this
    );
    if (flatLinearRing) {
      const flatLinearRings =
        /** @type {Array<Array<number>>} */
        (objectStack[objectStack.length - 1]);
      flatLinearRings[0] = flatLinearRing;
    }
  }

}

/**
 * @const
 * @type {Object<string, Object<string, import("../xml.js").Parser>>}
 */
GML2.prototype.GEOMETRY_FLAT_COORDINATES_PARSERS = {
  'http://www.opengis.net/gml': {
    'coordinates': makeReplacer(GML2.prototype.readFlatCoordinates),
  },
};

/**
 * @const
 * @type {Object<string, Object<string, import("../xml.js").Parser>>}
 */
GML2.prototype.FLAT_LINEAR_RINGS_PARSERS = {
  'http://www.opengis.net/gml': {
    'innerBoundaryIs': GML2.prototype.innerBoundaryIsParser,
    'outerBoundaryIs': GML2.prototype.outerBoundaryIsParser,
  },
};

/**
 * @const
 * @type {Object<string, Object<string, import("../xml.js").Parser>>}
 */
GML2.prototype.BOX_PARSERS_ = {
  'http://www.opengis.net/gml': {
    'coordinates': makeArrayPusher(GML2.prototype.readFlatCoordinates),
  },
};

/**
 * @const
 * @type {Object<string, Object<string, import("../xml.js").Parser>>}
 */
GML2.prototype.GEOMETRY_PARSERS = {
  'http://www.opengis.net/gml': {
    'Point': makeReplacer(GMLBase.prototype.readPoint),
    'MultiPoint': makeReplacer(GMLBase.prototype.readMultiPoint),
    'LineString': makeReplacer(GMLBase.prototype.readLineString),
    'MultiLineString': makeReplacer(GMLBase.prototype.readMultiLineString),
    'LinearRing': makeReplacer(GMLBase.prototype.readLinearRing),
    'Polygon': makeReplacer(GMLBase.prototype.readPolygon),
    'MultiPolygon': makeReplacer(GMLBase.prototype.readMultiPolygon),
    'Box': makeReplacer(GML2.prototype.readBox),
  },
};



export default GML2;
