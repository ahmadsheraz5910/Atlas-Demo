import OGC from "../../../external/ol/format/OGC"
import { Parser, makeObjectPropertySetter, pushParseAndPop } from "../../../external/ol/xml"
import { getLiteralName, getLiteralType } from "./expression"


const NonIdOperators = (ogcSpec:OGC) => {
    const readPropertyIsEqualTo = (node:Element,objectStack:Array<any>) => {
        const readPropertyName = getLiteralName
        const readPropertyLiteral = (node:Element) => getLiteralType(node,ogcSpec.gmlFormat)
        const EXPRESSION_PARSERS = {
            "http://www.opengis.net/ogc":{
                "PropertyName":makeObjectPropertySetter(readPropertyName),
                "Literal":makeObjectPropertySetter(readPropertyLiteral)
            }
        }
        const expression = pushParseAndPop(
            {}, 
            EXPRESSION_PARSERS, 
            node,
            objectStack
        ) as {
            PropertyName:ReturnType<typeof readPropertyName>,
            Literal:ReturnType<typeof readPropertyLiteral>
        } 
        if (expression["PropertyName"] && expression["Literal"]) {
            return {
                [expression["PropertyName"]]:expression["Literal"]
            }
        }
        if (expression["PropertyName"]) {
            return {
                [expression["PropertyName"]]:null
            }
        }
        
    }    
    return {
        readPropertyIsEqualTo
    }
}


export default NonIdOperators