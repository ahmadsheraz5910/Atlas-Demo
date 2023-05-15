import { parse } from "./external/ol/xml"
import { Adapter } from "./src/adapters/mongodb"
import readWFSRequest from "./src/parsers/wfs-parser"

interface Options {
    adapter:Adapter
}
export const OGCConnect = ({adapter}:Options) => {
    const { writeWFSRequest } = adapter


    return (source:string) => {
        const doc = parse("<Request>" + source + "</Request>");
        if (!doc) {
            return undefined
        }
        const node = doc.firstChild
        if (node?.nodeType !== 1) {
            return undefined
        }

        // Confirmed Node is NodeType
        const response = readWFSRequest((node as Element), [])
        if (response) {
            // WFS Request Confirmed
            return writeWFSRequest(response)
        }
    }
}

