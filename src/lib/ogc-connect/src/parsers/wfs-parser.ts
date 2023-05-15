import WFS, { Options, readFeaturesFromWfsReq } from "../../external/ol/format/WFS";
import Geometry from "../../external/ol/geom/Geometry";
import { makeArrayExtender, makeArrayPusher, makeObjectPropertySetter, parse, pushParseAndPop } from "../../external/ol/xml";
import { removeUndefinedsFromObject } from "../utils";
import ogcParser from "./filter-parser";
import { getLiteralName, getLiteralType } from "./filter-parser/expression";



const PropertyRequest = (wfsSpec:WFS) => {
  const {gmlFormat} = wfsSpec
  const getPropertyValue = (node:Element) => getLiteralType(node,gmlFormat)
  const PROPERTY_PARSER = {
    'http://www.opengis.net/wfs':{
      "Name":makeObjectPropertySetter(getLiteralName),
      "Value":makeObjectPropertySetter(getPropertyValue)
    }
  }

  return (node:Element, objectStack:Array<any>) => {
    const {Name, Value} = pushParseAndPop({}, PROPERTY_PARSER, node, objectStack) as
    {
      Name:ReturnType<typeof getLiteralName>, 
      Value:ReturnType<typeof getPropertyValue>
    }
    const object:{[key:string]:string | Geometry | null} = {}
    if (Name && Value) {
      object[Name] = Value
    }
    else if (Name) {
      object[Name] = null
    }
    return object
  }
}
const UpdateRequest = (wfsSpec:WFS) => {
  const readProperty = PropertyRequest(wfsSpec)
  const {readFilter} = ogcParser(wfsSpec.ogcFormat)
  
  const UPDATE_REQUEST_PARSERS = {
    'http://www.opengis.net/wfs':{
      "Property": makeObjectPropertySetter(readProperty, "properties")
    },
    'http://www.opengis.net/ogc':{
      "Filter":makeObjectPropertySetter(readFilter,"query")
    }
  }

  return (node:Element,objectStack:Array<any>) => {
    const layer = node.getAttribute("typeName")?.split(":").pop()
    if (!layer) {
      return undefined
    }

    const {query, properties} = pushParseAndPop(
      {
        properties:{}, 
        query:undefined
      },
      UPDATE_REQUEST_PARSERS,
      node,
      objectStack
    ) as {
      query:ReturnType<typeof readFilter>,
      properties:ReturnType<typeof readProperty>
    }
    if (!properties) {
      return undefined
    }
    return {
      layer,
      action:"update" as "update",
      properties,
      query
    } 
  }
}
export type WFSUpdateRequest = Exclude<ReturnType<ReturnType<typeof UpdateRequest>>, undefined>



const DeleteRequest = (wfsSpec:WFS) => {
  const {readFilter} = ogcParser(wfsSpec.ogcFormat)
  
  const DELETE_REQUEST_PARSERS = {
    'http://www.opengis.net/ogc':{
      "Filter":makeObjectPropertySetter(readFilter, "query")
    }
  }
  return (node:Element,objectStack:Array<any>) => { 
      const TypeName = node.getAttribute("typeName")?.split(":").pop()
      if (!TypeName) return undefined
      const response = pushParseAndPop(
        {
          layer:TypeName, 
          action:"delete" as "delete",
          query:undefined as ReturnType<typeof readFilter>
        },
        DELETE_REQUEST_PARSERS,
        node,
        objectStack
      ) 
      if (!response.query) {
        return undefined
      }
      return removeUndefinedsFromObject(response)
  }
}
const InsertRequest = (wfsSpec:WFS) => {
  return (node:Element) => {
    const response = readFeaturesFromWfsReq(node, wfsSpec.version, wfsSpec.gmlFormat)
    if (response) {
      const {features, context} = response
      const featureTypeNames = context["featureType"]
      const data = features
      .map((feature,index) => {
        return ({
          layer:featureTypeNames[index].split(":").pop(),
          action:"insert" as "insert", 
          data:feature
        })
      })
      return data
    }
  }
}



const TransactionRequest = (wfsSpec:WFS) => {
  const readDeleteRequest = DeleteRequest(wfsSpec)
  const readInsertRequest = InsertRequest(wfsSpec)
  const readUpdateRequest = UpdateRequest(wfsSpec)
  
  const TRANSACTION_REQUEST_PARSERS = {
    'http://www.opengis.net/wfs':{
      "Insert":makeArrayExtender(readInsertRequest),
      "Update":makeArrayPusher(readUpdateRequest),
      "Delete":makeArrayPusher(readDeleteRequest)
    }
  }

  return (node:Element, objectStack:Array<any>) => {
    type insertRequestType = (Exclude<ReturnType<typeof readInsertRequest>, undefined>) extends Array<infer T> ? T:never
    
    return pushParseAndPop([], TRANSACTION_REQUEST_PARSERS, node, objectStack) as  (
      Array<
        insertRequestType |
        Exclude<ReturnType<typeof readUpdateRequest>, undefined> |
        Exclude<ReturnType<typeof readDeleteRequest>, undefined>
      > | undefined
    )

  }
}

const readWFSRequest = (node:Element, objectStack:Array<any>) =>{ 
  const version = node.getAttribute("version")
  const wfsSpec = new WFS({
    version:version ?? undefined
  })
  const readTransactionRequest = TransactionRequest(wfsSpec)    
  const REQUEST_PARSER = {
    'http://www.opengis.net/wfs':{
      "Transaction":makeObjectPropertySetter(readTransactionRequest)
    }
  }    
  return removeUndefinedsFromObject(
    pushParseAndPop({}, REQUEST_PARSER, node as Element, objectStack) as
    {
      Transaction:ReturnType<typeof readTransactionRequest>
    }
  ) 
}    
export type WFSParserResponse = Exclude<ReturnType<typeof readWFSRequest>, undefined>



export default readWFSRequest
