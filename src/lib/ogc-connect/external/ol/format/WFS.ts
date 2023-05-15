import { pushParseAndPop, makeObjectPropertySetter, makeArrayPusher } from "../../ol/xml";
import GML2 from "../../ol/format/GML2";
import GML3 from "../../ol/format/GML3";
import GML32 from "../../ol/format/GML32";
import GMLBase from "./base/GMLBase";
import OGC from "./OGC";
import Feature from "../Feature";


const FEATURE_PREFIX = 'feature';
const XMLNS = 'http://www.w3.org/2000/xmlns/';
const OGCNS = {
  '2.0.0': 'http://www.opengis.net/ogc/1.1',
  '1.1.0': 'http://www.opengis.net/ogc',
  '1.0.0': 'http://www.opengis.net/ogc',
};
const WFSNS = {
  '2.0.0': 'http://www.opengis.net/wfs/2.0',
  '1.1.0': 'http://www.opengis.net/wfs',
  '1.0.0': 'http://www.opengis.net/wfs',
};
const FESNS = {
  '2.0.0': 'http://www.opengis.net/fes/2.0',
  '1.1.0': 'http://www.opengis.net/fes',
  '1.0.0': 'http://www.opengis.net/fes',
};
const SCHEMA_LOCATIONS = {
  '2.0.0':
    'http://www.opengis.net/wfs/2.0 http://schemas.opengis.net/wfs/2.0/wfs.xsd',
  '1.1.0':
    'http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.1.0/wfs.xsd',
  '1.0.0':
    'http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.0.0/wfs.xsd',
};
const GML_FORMATS = 
  new Map()
  .set("1.0.0", GML2)
  .set("2.0.0", GML32)
  .set("1.1.0", GML3)

const DEFAULT_VERSION = '1.1.0';
const FEATURE_COLLECTION_PARSERS = {
  'http://www.opengis.net/gml': {
    'boundedBy': makeObjectPropertySetter(
      GMLBase.prototype.readExtentElement,
      'bounds'
    ),
  },
  'http://www.opengis.net/wfs/2.0': {
    'member': makeArrayPusher(GMLBase.prototype.readFeaturesInternal),
  },
};


export interface Options {
  version?:string,  
  featureNS?:string
}

class WFS {
  version: string; 
  featureNS: string;
  gmlFormat: GMLBase;
  ogcFormat: OGC;
  constructor(options?:Options){
    this.version = options?.version ?? DEFAULT_VERSION
    this.featureNS = options?.featureNS ?? ""
    this.gmlFormat = new (GML_FORMATS.get(this.version))
    this.ogcFormat = new OGC()
  }
}

export const readFeaturesFromWfsReq = (node:Element, version:string, gmlFormat:GMLBase)
: {features:Array<Feature>, context:any} | undefined => {
  const context:any = {node};
  const object = [context];
  let featuresNS:any;
  if (version === '2.0.0') {
    featuresNS = FEATURE_COLLECTION_PARSERS;
  } else {
    featuresNS = gmlFormat.FEATURE_COLLECTION_PARSERS;
  }
  let features = pushParseAndPop(
    [],
    featuresNS,
    node,
    object,
    gmlFormat
  ) as Array<Feature>;
  if (!features) {
    return undefined
  }
  return {features, context}
}

export default WFS
