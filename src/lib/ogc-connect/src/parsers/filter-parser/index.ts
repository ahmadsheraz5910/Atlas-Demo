import OGC from "../../../external/ol/format/OGC";
import {  makeArrayPusher, makeObjectPropertySetter, pushParseAndPop } from "../../../external/ol/xml";
import { removeUndefinedsFromObject } from "../../utils";
import IdOperators from "./IdOperators";
import NonIdOperators from "./NonIdOperators";


// interface QueryFilter {
//     "IdOperators":{
//         ids:Array<string>
//     },
//     "NonIdOperators":{

//     }
// }

const ogcParser = (ogcSpec:OGC) => {
    const {readPropertyIsEqualTo} = NonIdOperators(ogcSpec)
    const {readFeatureId} = IdOperators(ogcSpec)
    
    const FILTER_ID_OPERATOR:{[key:string]:any} = {
        "http://www.opengis.net/ogc":{
            "FeatureId":makeArrayPusher(readFeatureId),
        }
    }
    const FILTER_NONID_OPERATOR:{[key:string]:any} = {
        "http://www.opengis.net/ogc":{
            "PropertyIsEqualTo":makeObjectPropertySetter(readPropertyIsEqualTo)
        }
    }

    return {
        readFilter:(node:Element,objectStack:Array<any>) => {   
            if (!node.firstElementChild) {
                return undefined
            }
            //const node = nod.firstElementChild 
            const FilterIdParsers = FILTER_ID_OPERATOR[node.namespaceURI ?? ""]
            if (FilterIdParsers[node.firstElementChild.localName]) {
                const filterIds = pushParseAndPop([],FILTER_ID_OPERATOR,node,objectStack) as Array<string>
                if (filterIds.length <= 0 ) {
                    return undefined
                }
                else {
                    return {
                        "IdOperators":{
                            ids:filterIds
                        }
                    }
                } 
            }
            
            const FilterNonIdParsers = FILTER_NONID_OPERATOR[node.namespaceURI ?? ""]
            if (FilterNonIdParsers[node.firstElementChild.localName]) {
                const A = removeUndefinedsFromObject(
                    pushParseAndPop({}, FILTER_NONID_OPERATOR, node, objectStack) as {   
                        PropertyIsEqualTo:ReturnType<typeof readPropertyIsEqualTo>
                    }
                )          
                if (!A) return undefined
                return {
                    "NonIdOperators":A
                }
                
            }
        }
    }
}
export type ogcFilter = Exclude<ReturnType<ReturnType<typeof ogcParser>["readFilter"]>, undefined>
export default ogcParser