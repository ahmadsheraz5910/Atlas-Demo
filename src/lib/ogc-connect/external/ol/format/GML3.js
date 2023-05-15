/**
 * @module ol/format/GML3
 */
import GML2 from './GML2.js';
import GMLBase, {GMLNS} from './base/GMLBase.js';
import LineString from '../geom/LineString.js';
import MultiLineString from '../geom/MultiLineString.js';
import MultiPolygon from '../geom/MultiPolygon.js';
import Polygon from '../geom/Polygon.js';
import {
  getAllTextContent,
  makeArrayExtender,
  makeArrayPusher,
  makeReplacer,
  parseNode,
  pushParseAndPop,
} from '../xml.js';
import {createOrUpdate} from '../extent.js';
import {extend} from '../array.js';
import {get as getProjection} from '../proj.js';
import {readNonNegativeIntegerString} from './xsd.js';

/**
 * @const
 * @type {string}
 * @private
 */
const schemaLocation =
  GMLNS +
  ' http://schemas.opengis.net/gml/3.1.1/profiles/gmlsfProfile/' +
  '1.0.0/gmlsf.xsd';

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
 * Feature format for reading and writing data in the GML format
 * version 3.1.1.
 * Currently only supports GML 3.1.1 Simple Features profile.
 *
 * @api
 */
class GML3 extends GMLBase {
  /**
   * @param {import("./base/GMLBase.js").Options} [options] Optional configuration object.
   */
  constructor(options) {
    options = options ? options : {};

    super(options);

    /**
     * @private
     * @type {boolean}
     */
    this.surface_ = options.surface !== undefined ? options.surface : false;

    /**
     * @private
     * @type {boolean}
     */
    this.curve_ = options.curve !== undefined ? options.curve : false;

    /**
     * @private
     * @type {boolean}
     */
    this.multiCurve_ =
      options.multiCurve !== undefined ? options.multiCurve : true;

    /**
     * @private
     * @type {boolean}
     */
    this.multiSurface_ =
      options.multiSurface !== undefined ? options.multiSurface : true;

    /**
     * @type {string}
     */
    this.schemaLocation = options.schemaLocation
      ? options.schemaLocation
      : schemaLocation;

    /**
     * @private
     * @type {boolean}
     */
    this.hasZ = options.hasZ !== undefined ? options.hasZ : false;
  }

  /**
   * @param {Element} node Node.
   * @param {Array<*>} objectStack Object stack.
   * @return {MultiLineString|undefined} MultiLineString.
   */
  readMultiCurve(node, objectStack) {
    /** @type {Array<LineString>} */
    const lineStrings = pushParseAndPop(
      [],
      this.MULTICURVE_PARSERS,
      node,
      objectStack,
      this
    );
    if (lineStrings) {
      const multiLineString = new MultiLineString(lineStrings);
      return multiLineString;
    }
    return undefined;
  }

  /**
   * @param {Element} node Node.
   * @param {Array<*>} objectStack Object stack.
   * @return {Array<number>|undefined} Polygon.
   */
  readFlatCurveRing(node, objectStack) {
    /** @type {Array<LineString>} */
    const lineStrings = pushParseAndPop(
      [],
      this.MULTICURVE_PARSERS,
      node,
      objectStack,
      this
    );
    const flatCoordinates = [];
    for (let i = 0, ii = lineStrings.length; i < ii; ++i) {
      extend(flatCoordinates, lineStrings[i].getFlatCoordinates());
    }
    return flatCoordinates;
  }

  /**
   * @param {Element} node Node.
   * @param {Array<*>} objectStack Object stack.
   * @return {MultiPolygon|undefined} MultiPolygon.
   */
  readMultiSurface(node, objectStack) {
    /** @type {Array<Polygon>} */
    const polygons = pushParseAndPop(
      [],
      this.MULTISURFACE_PARSERS,
      node,
      objectStack,
      this
    );
    if (polygons) {
      return new MultiPolygon(polygons);
    }
  }

  /**
   * @param {Element} node Node.
   * @param {Array<*>} objectStack Object stack.
   */
  curveMemberParser(node, objectStack) {
    parseNode(this.CURVEMEMBER_PARSERS, node, objectStack, this);
  }

  /**
   * @param {Element} node Node.
   * @param {Array<*>} objectStack Object stack.
   */
  surfaceMemberParser(node, objectStack) {
    parseNode(this.SURFACEMEMBER_PARSERS, node, objectStack, this);
  }

  /**
   * @param {Element} node Node.
   * @param {Array<*>} objectStack Object stack.
   * @return {Array<(Array<number>)>|undefined} flat coordinates.
   */
  readPatch(node, objectStack) {
    return pushParseAndPop(
      [null],
      this.PATCHES_PARSERS,
      node,
      objectStack,
      this
    );
  }

  /**
   * @param {Element} node Node.
   * @param {Array<*>} objectStack Object stack.
   * @return {Array<number>|undefined} flat coordinates.
   */
  readSegment(node, objectStack) {
    return pushParseAndPop([], this.SEGMENTS_PARSERS, node, objectStack, this);
  }

  /**
   * @param {Element} node Node.
   * @param {Array<*>} objectStack Object stack.
   * @return {Array<(Array<number>)>|undefined} flat coordinates.
   */
  readPolygonPatch(node, objectStack) {
    return pushParseAndPop(
      [null],
      this.FLAT_LINEAR_RINGS_PARSERS,
      node,
      objectStack,
      this
    );
  }

  /**
   * @param {Element} node Node.
   * @param {Array<*>} objectStack Object stack.
   * @return {Array<number>|undefined} flat coordinates.
   */
  readLineStringSegment(node, objectStack) {
    return pushParseAndPop(
      [null],
      this.GEOMETRY_FLAT_COORDINATES_PARSERS,
      node,
      objectStack,
      this
    );
  }

  /**
   * @param {Element} node Node.
   * @param {Array<*>} objectStack Object stack.
   */
  interiorParser(node, objectStack) {
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
  exteriorParser(node, objectStack) {
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

  /**
   * @param {Element} node Node.
   * @param {Array<*>} objectStack Object stack.
   * @return {Polygon|undefined} Polygon.
   */
  readSurface(node, objectStack) {
    /** @type {Array<Array<number>>} */
    const flatLinearRings = pushParseAndPop(
      [null],
      this.SURFACE_PARSERS,
      node,
      objectStack,
      this
    );
    if (flatLinearRings && flatLinearRings[0]) {
      const flatCoordinates = flatLinearRings[0];
      const ends = [flatCoordinates.length];
      let i, ii;
      for (i = 1, ii = flatLinearRings.length; i < ii; ++i) {
        extend(flatCoordinates, flatLinearRings[i]);
        ends.push(flatCoordinates.length);
      }
      return new Polygon(flatCoordinates, 'XYZ', ends);
    }
    return undefined;
  }

  /**
   * @param {Element} node Node.
   * @param {Array<*>} objectStack Object stack.
   * @return {LineString|undefined} LineString.
   */
  readCurve(node, objectStack) {
    /** @type {Array<number>} */
    const flatCoordinates = pushParseAndPop(
      [null],
      this.CURVE_PARSERS,
      node,
      objectStack,
      this
    );
    if (flatCoordinates) {
      const lineString = new LineString(flatCoordinates, 'XYZ');
      return lineString;
    }
    return undefined;
  }

  /**
   * @param {Element} node Node.
   * @param {Array<*>} objectStack Object stack.
   * @return {import("../extent.js").Extent|undefined} Envelope.
   */
  readEnvelope(node, objectStack) {
    /** @type {Array<number>} */
    const flatCoordinates = pushParseAndPop(
      [null],
      this.ENVELOPE_PARSERS,
      node,
      objectStack,
      this
    );
    return createOrUpdate(
      flatCoordinates[1][0],
      flatCoordinates[1][1],
      flatCoordinates[2][0],
      flatCoordinates[2][1]
    );
  }

  /**
   * @param {Node} node Node.
   * @param {Array<*>} objectStack Object stack.
   * @return {Array<number>|undefined} Flat coordinates.
   */
  readFlatPos(node, objectStack) {
    let s = getAllTextContent(node, false);
    const re = /^\s*([+\-]?\d*\.?\d+(?:[eE][+\-]?\d+)?)\s*/;
    /** @type {Array<number>} */
    const flatCoordinates = [];
    let m;
    while ((m = re.exec(s))) {
      flatCoordinates.push(parseFloat(m[1]));
      s = s.substr(m[0].length);
    }
    if (s !== '') {
      return undefined;
    }
    const context = objectStack[0];
    const containerSrs = context['srsName'];
    let axisOrientation = 'enu';
    if (containerSrs) {
      const proj = getProjection(containerSrs);
      axisOrientation = proj.getAxisOrientation();
    }
    if (axisOrientation === 'neu') {
      let i, ii;
      for (i = 0, ii = flatCoordinates.length; i < ii; i += 3) {
        const y = flatCoordinates[i];
        const x = flatCoordinates[i + 1];
        flatCoordinates[i] = x;
        flatCoordinates[i + 1] = y;
      }
    }
    const len = flatCoordinates.length;
    if (len == 2) {
      flatCoordinates.push(0);
    }
    if (len === 0) {
      return undefined;
    }
    return flatCoordinates;
  }

  /**
   * @param {Element} node Node.
   * @param {Array<*>} objectStack Object stack.
   * @return {Array<number>|undefined} Flat coordinates.
   */
  readFlatPosList(node, objectStack) {
    const s = getAllTextContent(node, false).replace(/^\s*|\s*$/g, '');
    const context = objectStack[0];
    const containerSrs = context['srsName'];
    const contextDimension = context['srsDimension'];
    let axisOrientation = 'enu';
    if (containerSrs) {
      const proj = getProjection(containerSrs);
      axisOrientation = proj.getAxisOrientation();
    }
    const coords = s.split(/\s+/);
    // The "dimension" attribute is from the GML 3.0.1 spec.
    let dim = 2;
    if (node.getAttribute('srsDimension')) {
      dim = readNonNegativeIntegerString(node.getAttribute('srsDimension'));
    } else if (node.getAttribute('dimension')) {
      dim = readNonNegativeIntegerString(node.getAttribute('dimension'));
    } else if (
      /** @type {Element} */ (node.parentNode).getAttribute('srsDimension')
    ) {
      dim = readNonNegativeIntegerString(
        /** @type {Element} */ (node.parentNode).getAttribute('srsDimension')
      );
    } else if (contextDimension) {
      dim = readNonNegativeIntegerString(contextDimension);
    }
    let x, y, z;
    const flatCoordinates = [];
    for (let i = 0, ii = coords.length; i < ii; i += dim) {
      x = parseFloat(coords[i]);
      y = parseFloat(coords[i + 1]);
      z = dim === 3 ? parseFloat(coords[i + 2]) : 0;
      if (axisOrientation.substr(0, 2) === 'en') {
        flatCoordinates.push(x, y, z);
      } else {
        flatCoordinates.push(y, x, z);
      }
    }
    return flatCoordinates;
  }



}

/**
 * @const
 * @type {Object<string, Object<string, import("../xml.js").Parser>>}
 */
GML3.prototype.GEOMETRY_FLAT_COORDINATES_PARSERS = {
  'http://www.opengis.net/gml': {
    'pos': makeReplacer(GML3.prototype.readFlatPos),
    'posList': makeReplacer(GML3.prototype.readFlatPosList),
    'coordinates': makeReplacer(GML2.prototype.readFlatCoordinates),
  },
};

/**
 * @const
 * @type {Object<string, Object<string, import("../xml.js").Parser>>}
 */
GML3.prototype.FLAT_LINEAR_RINGS_PARSERS = {
  'http://www.opengis.net/gml': {
    'interior': GML3.prototype.interiorParser,
    'exterior': GML3.prototype.exteriorParser,
  },
};

/**
 * @const
 * @type {Object<string, Object<string, import("../xml.js").Parser>>}
 */
GML3.prototype.GEOMETRY_PARSERS = {
  'http://www.opengis.net/gml': {
    'Point': makeReplacer(GMLBase.prototype.readPoint),
    'MultiPoint': makeReplacer(GMLBase.prototype.readMultiPoint),
    'LineString': makeReplacer(GMLBase.prototype.readLineString),
    'MultiLineString': makeReplacer(GMLBase.prototype.readMultiLineString),
    'LinearRing': makeReplacer(GMLBase.prototype.readLinearRing),
    'Polygon': makeReplacer(GMLBase.prototype.readPolygon),
    'MultiPolygon': makeReplacer(GMLBase.prototype.readMultiPolygon),
    'Surface': makeReplacer(GML3.prototype.readSurface),
    'MultiSurface': makeReplacer(GML3.prototype.readMultiSurface),
    'Curve': makeReplacer(GML3.prototype.readCurve),
    'MultiCurve': makeReplacer(GML3.prototype.readMultiCurve),
    'Envelope': makeReplacer(GML3.prototype.readEnvelope),
  },
};

/**
 * @const
 * @type {Object<string, Object<string, import("../xml.js").Parser>>}
 */
GML3.prototype.MULTICURVE_PARSERS = {
  'http://www.opengis.net/gml': {
    'curveMember': makeArrayPusher(GML3.prototype.curveMemberParser),
    'curveMembers': makeArrayPusher(GML3.prototype.curveMemberParser),
  },
};

/**
 * @const
 * @type {Object<string, Object<string, import("../xml.js").Parser>>}
 */
GML3.prototype.MULTISURFACE_PARSERS = {
  'http://www.opengis.net/gml': {
    'surfaceMember': makeArrayPusher(GML3.prototype.surfaceMemberParser),
    'surfaceMembers': makeArrayPusher(GML3.prototype.surfaceMemberParser),
  },
};

/**
 * @const
 * @type {Object<string, Object<string, import("../xml.js").Parser>>}
 */
GML3.prototype.CURVEMEMBER_PARSERS = {
  'http://www.opengis.net/gml': {
    'LineString': makeArrayPusher(GMLBase.prototype.readLineString),
    'Curve': makeArrayPusher(GML3.prototype.readCurve),
  },
};

/**
 * @const
 * @type {Object<string, Object<string, import("../xml.js").Parser>>}
 */
GML3.prototype.SURFACEMEMBER_PARSERS = {
  'http://www.opengis.net/gml': {
    'Polygon': makeArrayPusher(GMLBase.prototype.readPolygon),
    'Surface': makeArrayPusher(GML3.prototype.readSurface),
  },
};

/**
 * @const
 * @type {Object<string, Object<string, import("../xml.js").Parser>>}
 */
GML3.prototype.SURFACE_PARSERS = {
  'http://www.opengis.net/gml': {
    'patches': makeReplacer(GML3.prototype.readPatch),
  },
};

/**
 * @const
 * @type {Object<string, Object<string, import("../xml.js").Parser>>}
 */
GML3.prototype.CURVE_PARSERS = {
  'http://www.opengis.net/gml': {
    'segments': makeReplacer(GML3.prototype.readSegment),
  },
};

/**
 * @const
 * @type {Object<string, Object<string, import("../xml.js").Parser>>}
 */
GML3.prototype.ENVELOPE_PARSERS = {
  'http://www.opengis.net/gml': {
    'lowerCorner': makeArrayPusher(GML3.prototype.readFlatPosList),
    'upperCorner': makeArrayPusher(GML3.prototype.readFlatPosList),
  },
};

/**
 * @const
 * @type {Object<string, Object<string, import("../xml.js").Parser>>}
 */
GML3.prototype.PATCHES_PARSERS = {
  'http://www.opengis.net/gml': {
    'PolygonPatch': makeReplacer(GML3.prototype.readPolygonPatch),
  },
};

/**
 * @const
 * @type {Object<string, Object<string, import("../xml.js").Parser>>}
 */
GML3.prototype.SEGMENTS_PARSERS = {
  'http://www.opengis.net/gml': {
    'LineStringSegment': makeArrayExtender(
      GML3.prototype.readLineStringSegment
    ),
  },
};

/**
 * @const
 * @type {Object<string, Object<string, import("../xml.js").Parser>>}
 */
GMLBase.prototype.RING_PARSERS = {
  'http://www.opengis.net/gml': {
    'LinearRing': makeReplacer(GMLBase.prototype.readFlatLinearRing),
    'Ring': makeReplacer(GML3.prototype.readFlatCurveRing),
  },
};


export default GML3;
