import { Filter, MongoClient, ObjectId,Document } from "mongodb";
import { getExpectedTypeOfAttribute, getLayerSchema } from "./schema";
import Geometry from "../../../external/ol/geom/Geometry";
import Feature from "../../../external/ol/Feature";
import {  writeGeometry as writeGeometryAsJSON } from "../../../external/ol/format/GeoJSON";
import { serializeDottedProperties } from "./util";
import { ogcFilter } from "../../parsers/filter-parser";
import { WFSParserResponse, WFSUpdateRequest } from "../../parsers/wfs-parser";



const verifyProperties = (
    properties:{[key:string]:string | Geometry | null},
    attributeTypes:{[key:string]:string}
) => {
    const filterProperties = Object.entries(properties)
    // apply policies and  update values
    .map(([key,value]) => {
        return [
            key,
            (value as any)
        ]
    })
    .filter(([key,value]) => {
        const expectedType = getExpectedTypeOfAttribute(attributeTypes[key])
        // [Policy]: Cannot update Object Id
        if (expectedType === ObjectId || key === "_id")  {
            return false
        }
        return true
        // // [Policy]: Don't allow changing of Geometry value from
        // // anyother value then geometry. This will make sure that geometry inherent
        // // strucure isn't destroyed
        // else if (
        //     expectedType === Geometry
        //     && (value instanceof Geometry || value === null) 
        // ) {
        //     value = value ? writeGeometryAsJSON(value):value
        //     return true
        // }
        // [Policy]: Allow adding of any extra attribute, except geometry
        // else {
        //     if (value instanceof Geometry) {
        //         value = writeGeometryAsJSON(value)
        //     }else {
        //         const newValue = parseInt(value)
        //         if (!isNaN(newValue)) {
        //             // Convert string to number
        //             value = newValue    
        //         }
        //     }
        //     return true
        // }
    })
    .map(([key,value]) => {
        let newValue = value;
        if (value instanceof Geometry) {
            newValue = writeGeometryAsJSON(value)
        } else {
            newValue = parseInt(value)
            if (isNaN(newValue)) {
                // Convert string to number
                newValue = value    
            }
        }
        return [
            key,
            newValue
        ]
    })

    return (
        filterProperties
        .reduce((properties, [key,value]) => {
            properties[key] = value
            return properties
        }, {} as {[key:string]:any})
    )
}


export const MongoDBAdapter = (dbClient:MongoClient, databaseName:string) => {
    const mongoFilterFromOGC = (query:ogcFilter) => {
        const {IdOperators,NonIdOperators} = query
        const mongoQuery:Filter<Document> = {}
        if (IdOperators) {
            mongoQuery["_id"] = {
                "$in":IdOperators.ids.map(id => new ObjectId(id))
            }
        }
        if (NonIdOperators) {
            Object.entries(NonIdOperators.PropertyIsEqualTo)
            .map(([key,value]) => {
                mongoQuery[key] = value
            })
        }
        return mongoQuery
    }
    const writeWFSTransactionRequest = async (transactions:WFSParserResponse["Transaction"]) => {
        const TransactionResponse = {
            "TransactionSummary": {
                "totalInserted":0,
                "totalUpdated":0,
                "totalDeleted":0,
            }
        }
        for(const transaction of transactions) {
            const {action,layer}  = transaction
            const layerCursor = dbClient.db(databaseName).collection(layer)
            const attributeTypes = await getLayerSchema(dbClient, databaseName, layer)
            
            if (action === "insert") {
                const {data} = transaction
                const approvedParsedData = serializeDottedProperties(
                    verifyProperties(data.getProperties(), attributeTypes)
                )
                const response = await layerCursor.insertOne(approvedParsedData)
                response.acknowledged && TransactionResponse["TransactionSummary"]["totalInserted"]++
            }
            else if (action === "update") {
                const {query,properties} = transaction
                const mongoQuery = query ? mongoFilterFromOGC(query):{}
                const data = verifyProperties(properties, attributeTypes)
                const response = await layerCursor.updateMany(mongoQuery, {
                    $set:data  
                })
                response.acknowledged && TransactionResponse["TransactionSummary"]["totalUpdated"]++
            }
            else if (action === "delete") {
                const {query} = transaction
                const mongoQuery = mongoFilterFromOGC(query)
                const response = await layerCursor.deleteMany(mongoQuery)
                response.acknowledged && TransactionResponse["TransactionSummary"]["totalDeleted"]++
            }                
        }
        
        return TransactionResponse
    }
    const writeWFSRequest = (wfs:WFSParserResponse) => {
        const {Transaction} = wfs
        return writeWFSTransactionRequest(Transaction)
    }

    return {
        writeWFSRequest
    }
}
export type Adapter = ReturnType<typeof MongoDBAdapter>