import OGC from "../../../external/ol/format/OGC"
import { Parser } from "../../../external/ol/xml"

const IdOperators = (ogcSpec:OGC) => {
    const readFeatureId = (node:Element, objectStack:Array<any>) =>{
        return node.getAttribute('fid') ?? undefined
        // const object = objectStack[objectStack.length - 1]
        // const id = node.getAttribute('fid') 
        // if (Boolean(id)) {
        //     if (!object["_id"]) {
        //         object["_id"] = {$in:[]}
        //     }
        //     object["_id"]["$in"].push(id)        
        // }        
    }
    return {
        readFeatureId
    }
}
export default IdOperators
