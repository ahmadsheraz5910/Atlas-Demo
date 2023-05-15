import { MongoClient, ObjectId } from "mongodb";
import { z } from 'zod';
import Geometry from '../../../external/ol/geom/Geometry';


export const getExpectedTypeOfAttribute = (type:string) => {
    switch(type) {
        case "org.locationtech.jts.geom.Geometry":
            return Geometry
        case "org.bson.types.ObjectId":
            return ObjectId
        case "java.lang.Integer":
            return Number
        case "java.lang.String":
            return String
        default:
            return undefined
    }
}

const SchemaZod = z.object({
    _id:z.instanceof(ObjectId),
    typeName:z.string(),
    userData:z.any(),
    geometryDescriptor:z.any(),
    attributeDescriptors:z.array(z.object({
        localName:z.string(),
        type:z.object({
            binding:z.string()
        }),
        userData:z.any()
    }))
})

export const getLayerSchema = async (
    dbClient:MongoClient,
    databaseName:string,
    layerName:string
) => {
    const documentCursor = await dbClient.db(databaseName)
    .collection("schemas")
    .findOne({typeName:layerName})

    if (!documentCursor) {
        console.log(`Internal Error: Schema for ${layerName} doesn't exist`)
        // Returing Empty Schema
        return {}
    }
 
    const {attributeDescriptors} = SchemaZod.parse(documentCursor)
    const attributeTypes = attributeDescriptors
    .reduce((object, attribute, index) => {
        object[attribute.localName] = attribute.type.binding
        return object
    }, {} as {[key:string]:string})
    
    return attributeTypes
}