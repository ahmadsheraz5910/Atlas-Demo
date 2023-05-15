import GMLBase from "../../../external/ol/format/base/GMLBase";
import { writeGeometry } from "../../../external/ol/format/GeoJSON";
import Geometry from "../../../external/ol/geom/Geometry";
import { getAllTextContent, ONLY_WHITESPACE_RE } from "../../../external/ol/xml";

export const getLiteralName = (node:Element) => {
    if (
        node.childNodes.length === 0 ||
        (node.childNodes.length === 1 &&
        (node.firstChild?.nodeType === 3 || node.firstChild?.nodeType === 4))
    ) {
        let value = getAllTextContent(node, false)
        if (ONLY_WHITESPACE_RE.test(value)) {
            return undefined
        }
        return value;
    }
}

export const getLiteralType = (node:Element, gmlFormat:GMLBase) => {
    let value;
    // check if it is simple attribute
    if (
        node.childNodes.length === 0 ||
        (node.childNodes.length === 1 &&
        (node.firstChild?.nodeType === 3 || node.firstChild?.nodeType === 4))
    ) {
        value = getAllTextContent(node, false);
        if (ONLY_WHITESPACE_RE.test(value)) {
            value = undefined;
        }
    // else geometry
    } else {
        value = gmlFormat.readGeometryElement(node, [{}]) as Geometry | undefined
    }        
    return value
}