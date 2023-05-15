import {RequestInfo, RequestInit,} from 'node-fetch'
const fetch = (url: RequestInfo, init?: RequestInit) => import('node-fetch').then(({default: fetch}) => fetch(url, init))

interface Config {
    host:string
    WorkspacePrefix:string,
    authourizationHeader:string,
    StorePrefix:string
}
const GeoserverControllerRest = ({
    host,
    WorkspacePrefix,
    authourizationHeader,
    StorePrefix
}:Config) => {
    const URL = host + "/rest"
    const createWorkspace = async (projectId:string) => {
        const workspaceTitle = WorkspacePrefix + projectId
        await fetch(`${URL}/workspaces`, {
            method:"post",
            headers:{
                "Authorization":authourizationHeader,
                "Content-Type":"application/xml"
            },
            body:`<workspace>
                <name>${workspaceTitle}</name>
            </workspace>`
        })
        return await fetch(`${URL}/namespaces/${workspaceTitle}`, {
            method:"put",
            headers:{
                "Authorization":authourizationHeader,
                "Content-Type":"application/json"
            },
            body:`{
                "namespace": {
                    "prefix": "${workspaceTitle}",
                    "uri": "${process.env.HOST}/api/v1/projects/${workspaceTitle}/ows",
                    "isolated": false
                }
            }`
        })
    }

    const createStoreWithMongoDB = async (projectId:string, projectDatabase:string) => {
        const workspaceTitle = WorkspacePrefix + projectId
        const workspaceStore = StorePrefix + projectId
        return await fetch(`${URL}/workspaces/${workspaceTitle}/datastores`, {
            method:"post",
            headers:{
                "Authorization":authourizationHeader,
                "Content-Type":"application/xml"
            },
            // Keeping data_store and schema_store equal ensures that schema is inferred, thus giving us the options
            // such as extendable properties, and dotted properties.
            body:`<dataStore>
            <name>${workspaceStore}</name>
            <connectionParameters>
                <data_store>mongodb://localhost:27017/${projectDatabase}</data_store>
                <schema_store>mongodb://localhost:27017/${projectDatabase}</schema_store>
            </connectionParameters>
            </dataStore>`
        })
    }
    const createLayerWithData = async (layerName:string, projectId:string) => {
        const workspaceTitle = WorkspacePrefix + projectId
        const workspaceStore = StorePrefix + projectId
        return await fetch(`${URL}/workspaces/${workspaceTitle}/datastores/${workspaceStore}/featuretypes`, {
                method:"post",
                headers:{
                    "Authorization":authourizationHeader,
                    "Content-Type":"application/xml"
                },
                body:`<featureType>
                    <name>${layerName}</name>
                    <nativeName>${layerName}</nativeName>
                    <title>${layerName}</title>
                </featureType>`
            })
    }
    return {
        createWorkspace,
        createStoreWithMongoDB,
        createLayerWithData
    }
}
const GeoserverControllerOWS = ({host, authourizationHeader, WorkspacePrefix}:Config) => {
    const handleGetRequest = async (projectId:string, query:string) => {
        const workspaceTitle = WorkspacePrefix + projectId
        const response = await fetch(`${host}/${workspaceTitle}/ows?${query}`)
        return (response)
    }
    const handlePostRequest = async (projectId:string, body:any) => {
        const workspaceTitle = WorkspacePrefix + projectId
        return (await fetch(
            `${host}/${workspaceTitle}/ows`,
            {
                method:"post",
                headers:{
                    "Authorization":authourizationHeader,
                    "Content-Type":"application/xml"
                },
                body:body
            }
        ))
    }
    return {
        handleGetRequest,
        handlePostRequest
    }
}
const GeoserverController = () => {
    const userName =  "admin"
    const userPwd = "geoserver"
    const config = {
        host: "http://localhost:8080/geoserver",
        authourizationHeader:'Basic ' + Buffer.from(`${userName}:${userPwd}`).toString("base64"),
        WorkspacePrefix:"Atlas_",
        StorePrefix:"Mongo_"
    }
    const getWorkspace = (projectId:string) => {
        return config.WorkspacePrefix + projectId
    }
    return {
        rest:() => GeoserverControllerRest(config),
        ows:() => GeoserverControllerOWS(config),
        getWorkspace
    }

}

export default GeoserverController