

  
function handleArray(obj:{[key:string]:any}, keys:Array<string>, value:any) {
    let arr = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!arr[k]) {
            arr[k] = [];
        }
        arr = arr[k];
    }
    const idx = keys[keys.length - 1];
    arr[idx] = value;
}
  
function handleObject(obj:{[key:string]:any}, keys:Array<string>, value:any) {
    let currObj = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        currObj[k] = currObj[k] || {};
        currObj = currObj[k];
    }
    currObj[keys[keys.length - 1]] = value;
}
export function serializeDottedProperties(data:{[key:string]:any}) {
    const convertedData = {} as {[key:string]:any};
    for (const key in data) {
        const value = data[key];
  
        // properties.status
        // properties.status.0
        // properties.status.0.new

        const keys = key.split(".");

        let obj = convertedData;
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            const possibleIndex = parseInt(k)
            if (!isNaN(possibleIndex) && Array.isArray(obj)){
                if (possibleIndex <= obj.length - 1) {
                    obj = obj[possibleIndex]
                } else {
                    for(let i=0; i< possibleIndex - 1;i++){
                        obj.push(null)
                    }
                    obj.push({})
                    obj = obj[obj.length - 1]
                }
            }else {
                if (i !== keys.length - 1) {
                    // Not Last Value
                    const possibleIndex = parseInt(keys[i + 1])
                    if (!isNaN(possibleIndex)) {
                        obj[k] = obj[k] || [];        
                    } else {
                        obj[k] = obj[k] || {};        
                    }
                } else {
                    obj[k] = obj[k] || {};
                }
                obj = obj[k];
            }
            
        }

        const lastKey = keys[keys.length - 1];
        obj[lastKey] = value;
    }
  
    return convertedData;
}



// export const serializeDottedProperties = (properties:Object) => {
//     const newProperties = {} as {[key:string]:any}
//     for(const [key,value] of Object.entries(properties)) {
//         const keys = key.split(".") as Array<string>
//         //properties.status.2.else
//         //properties.status.2
//         //properties.status.0.new
//         //properties.status.0
//         //properties
//         keys.reduce((acc, attr, index) => {
//             const arrayIndex = parseInt(attr)
//             if (!isNaN(arrayIndex)) {
//                 if (Array.isArray(acc)){
//                     if (arrayIndex < acc.length - 1) {
//                         if (index === keys.length - 1){
//                             acc[arrayIndex] = value
//                             return acc
//                         } else {
//                             acc[arrayIndex] = acc[arrayIndex] ?? {}
//                             return acc[arrayIndex]
//                         }
//                     } else {
//                         acc = [...acc.map(a => a)]
//                         for(let i=0; i < arrayIndex;i++){
//                             acc.push(null)
//                         }
//                         if (index === keys.length - 1){
//                             acc.push(value)
//                             return acc
//                         } else {
//                             acc.push({})
//                             return acc[acc.length - 1]
//                         }
//                     }
//                 } else {
//                     let newAcc = []
//                     for(let i=0; i < arrayIndex;i++){
//                         newAcc.push(null)
//                     }
//                     if (index === keys.length - 1){
//                         newAcc.push(value)
//                         acc = [...newAcc]
//                         return acc
//                     } else {
//                         newAcc.push({})
//                         return newAcc[newAcc.length - 1]
//                     }
                    
//                 }
//             }
            
//             const nextAttr = keys[Math.max(index + 1,keys.length - 1)]
//             const prevAttr = keys[Math.min(index - 1,0)]
//             const prevAttrAsIndex = parseInt(prevAttr)
//             const nextAttrAsIndex = parseInt(nextAttr)
//             if (!isNaN(nextAttrAsIndex)){
//                 // next attribute is a number
//                 // [Missing] Handle the case if there is already an existing object which is not an array
//                 acc[attr] = acc[attr] ?? []
//                 return acc[attr]
//             }
//             if (!isNaN(prevAttrAsIndex)) {
//                 // prev attribute was a number therefore acc[attr] is Array
//                 if (prevAttrAsIndex <= acc[attr].length - 1) {
//                     acc[attr][prevAttrAsIndex] = {}
//                 }else {
//                     for(let i=0; i < prevAttrAsIndex; i++) {
//                         acc[attr].push(null)
//                     }
//                     acc[attr].push({})
//                 }
//                 return acc[attr][prevAttrAsIndex]
//             }
//             if (index === keys.length - 1) {
//                 acc[attr] = value
//                 return acc        
//             }

            
//             // if (index === 0) {
//             //     // First Value
                
//             // }
//             // else if (index === keys.length - 1) {
//             //     // Last Value
//             //     acc[attr] = value
//             //     return acc    
//             // } else {
//             //     // Middle Value
//             //     const nextAttr = keys[index + 1]
//             //     const prevAttr = keys[index - 1]
//             //     const prevAttrAsIndex = parseInt(prevAttr)
//             //     const nextAttrAsIndex = parseInt(nextAttr)
                
                
                
//             //     // if (!isNaN(parseInt(nextAttr))) {
//             //     //     // Handle the case if there is already an existing object which is not an array
//             //     //     acc[attr] = acc[attr] ?? []
//             //     // }else {
//             //     //     acc[attr] = acc[attr] ?? {}
//             //     // }
//             //     return acc[attr]
//             // }
            
//         }, newProperties)
        
//     }
//     return newProperties
    
// }

// /**
//  * New feature object by transforming it's properties keys with "." to nested properties
//  * @param feature 
//  * @returns Feature
//  */
// export const TransformFeatureKeys = (f:Feature) => {
//     //const feature = new Feature(f)
//     const feature = f.clone()
//     feature.setId(f.getId())
//     const newProperties:{[key:string]:any} = {}  
//     const properties = feature.getProperties()
//     for (const [key, value] of Object.entries(properties)) {
//         const identifiers = key.split(".") as Array<string>
//         if (identifiers.length > 1) {
//             feature.unset(key, true)
//             identifiers.reduce((prev, curr, index) => {
//                 if (index === identifiers.length - 1) {
//                     prev[curr] = prev[curr] ?? value
//                 } else {
//                     prev[curr] = prev[curr] ?? {}
//                 }
//                 return prev[curr]
//             }, newProperties)
//         } else {
//             newProperties[identifiers[0]] = value
//         }
//     }
//     feature.setProperties(newProperties)
//     return feature
// }

// /**
//  * Converts feature to GeoJson
//  * This must be improved, redudant dependencies
//  * @param feature 
//  * @returns JSON object
//  */
// export const FeatureToGeoJson = (feature:Feature) => {
//     const geojson = new GeoJSON({geometryName: "geometry"})      
//     const GeoJSONFeature:any = JSON.parse(geojson.writeFeature(feature))
//     delete GeoJSONFeature["type"]
//     return GeoJSONFeature
// }
