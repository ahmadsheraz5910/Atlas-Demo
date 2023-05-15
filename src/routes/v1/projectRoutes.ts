import { Router} from "express";
import Joi from "joi";
import {  createProtectedRequest, createPublicRequest } from "../../request";
import { mongodbConfig } from "../../config/config";
import { Pool } from "pg";
import { omit } from "lodash";
import validateProjectId from "../../middlewares/project";
import GeoserverController from "../../controllers/Geoserver";
import { MongoDBAdapter } from "../../lib/ogc-connect/src/adapters/mongodb";
import { OGCConnect } from "../../lib/ogc-connect";

// Controllers
const GetSpatialTable = async (db:Pool,tableName:string) => {
    const columns = await db.query(`SELECT array_to_string(ARRAY(SELECT  c.column_name
        FROM information_schema.columns As c WHERE table_name = '${tableName}'
        AND  c.column_name NOT IN('geom')), ',') as Columns;`)
    if (columns.rowCount <= 0) throw new Error("Table Name isn't correct")
    const columnNames = columns.rows[0].columns.split(",").map((cn:string) => "\"" + cn + "\"").join(",")
    const SpatialData = await db.query(`SELECT ${columnNames}, ST_AsGeoJSON(geom) as geometry from ${tableName};`)    
    return SpatialData.rows.map(row => {
        return {
            geometry:JSON.parse(row.geometry),
            properties:omit(row, ["id", "geometry"])
        }
    })
}


const projectRoutes = Router()
// List all projects
.get("/", createProtectedRequest({
    resolve:async ({res,connections}) => {
        const dbClient = connections.MongoClient
        const userId = res.locals.user.id
        const allProjects = await dbClient.db(mongodbConfig.primary.db)
        .collection("Projects")
        .find({userId})
        .toArray()
        res.status(200).json(allProjects)
    }
}))
// Create a new project 
.post("/create-project", createProtectedRequest({
    input:Joi.object({
        projectName:Joi.string().default("Untitled")
    }),
    resolve:async ({req,res, connections}) => {
        const ProjectCollection = mongodbConfig.primary.collections.projects
        const dbClient = connections.MongoClient
        const { projectName } = req.body
        const userId = res.locals.user.id
        const {createWorkspace, createStoreWithMongoDB} = GeoserverController().rest()

        const newProject = await dbClient.db(mongodbConfig.primary.db)
        .collection(ProjectCollection)
        .insertOne({
            title:projectName,
            userId
        })
        const projectId = newProject.insertedId.toString()
        const databaseTitle = mongodbConfig.workspaces.db + "_" + userId + "_" + projectId
        
        // Create a new workspace on geoserver
        await createWorkspace(projectId)
        // Associate a new db store with that workspace on geoserver
        await createStoreWithMongoDB(projectId,databaseTitle)

        return res.status(200).json({projectId})
    }
}))
// List all layers from postgres database that can be attached to projects
.get("/layers",  createProtectedRequest({
    resolve:async ({res, connections}) => {
        const {PostGres} = connections
        const results = await PostGres.query("select tablename from pg_catalog.pg_tables WHERE schemaname = 'public' AND tablename != 'spatial_ref_sys';")    
        res.status(200).json(results.rows.map((r) => r.tablename))
    }
}))
// Get a single layer, columns info from postgres database
.get("/layers/:tableName", createProtectedRequest({
    resolve:async ({req,res, connections}) => {
        const tableName = req.params.tableName
        const {PostGres} = connections
        res.status(200).json(await GetSpatialTable(PostGres,tableName))
    }
})) 


// Attach a layer to a project
.post("/:projectId/layers", createProtectedRequest({
    input:Joi.object({
        layer:Joi.string()
    }),
    middlewares:[validateProjectId],
    resolve:async ({req,res, connections}) => {
        const { layer } = req.body
        const { projectId } = req.params
        const userId = res.locals.user.id

        const {MongoClient:dbClient, PostGres} = connections
        const {createLayerWithData} = GeoserverController().rest()
        
        const projectDatabase = mongodbConfig.workspaces.db + "_" + userId + "_" + projectId
        const projectDBClient = dbClient.db(projectDatabase)

        const existingLayers = (await projectDBClient.listCollections().toArray()).map(layer => layer.name)
        if (!existingLayers.includes(layer)) {        
            // Data copied to this project database as a collection
            const spatialDocs = (await GetSpatialTable(PostGres,layer))
            const newCollection = await projectDBClient.createCollection(layer)
            await (newCollection).insertMany(spatialDocs)
            await projectDBClient.collection(layer).createIndex({ "geometry": "2dsphere" })                    
            
            // Create layer based upon the data added
            const response = await createLayerWithData(layer, projectId)
            return response.body.pipe(res.status(200).contentType("application/xml"))
        } 
        return res.status(400).send(`Layer:${layer} already exists`)
    }
}))

// OWS GET Services through geoserver
.get("/:projectId/ows", createPublicRequest({
    middlewares:[validateProjectId],
    resolve:async ({req,res, connections}) => {
        const {projectId} = req.params
        const query = new URLSearchParams(req.query as any)
        const {handleGetRequest} = GeoserverController().ows()
        const response = await handleGetRequest(projectId, query.toString())
        response.body.pipe(res.status(200).contentType("application/xml"))
    }
}))
.post("/:projectId/ows", createPublicRequest({
    middlewares:[validateProjectId],
    resolve:async ({req,res, connections}) => {
        const userId = "6432d4f1a53fa428e58b4569"
        const {projectId} = req.params

        const dbClient = connections.MongoClient    
        const projectDatabase = mongodbConfig.workspaces.db + "_" + userId + "_" + projectId
        const workspaceName = GeoserverController().getWorkspace(projectId)
        
        const readRequest = OGCConnect({
            adapter:MongoDBAdapter(dbClient, projectDatabase)
        })
        
        // When This Responded Is Not Undefined Then We Can REMOVE GEOSERVER COMPLETELY
        const responded = await readRequest(req.body)
        if (responded) {
            res.status(200).json(responded)
        }
        else {
            // Pass request to Geoserver
            const {handlePostRequest} = GeoserverController().ows()
            const response = await handlePostRequest(projectId,req.body)
            res.status(200).contentType("application/xml").send(response)
        }
        
    }
}))




export default projectRoutes;
