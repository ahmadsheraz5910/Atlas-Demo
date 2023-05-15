import GML3 from "./GML3";
import GMLBase from "./base/GMLBase";

class OGC  {
    OGCNS: string;
    gmlFormat: GMLBase;
    constructor(){
        this.OGCNS = 'http://www.opengis.net/ogc';
        this.gmlFormat = new GML3()
    }
}

export default OGC