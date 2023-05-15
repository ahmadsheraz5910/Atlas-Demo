import  {NextFunction, Request,Response} from 'express'
import { MongoDbConnection } from '../db'
import { mongodbConfig } from '../config/config'
import { ObjectId } from 'mongodb'
const validateProjectId = async (req: Request, res: Response, next?:NextFunction):Promise<void> => {
    try {
        const {projectId} = req.params
        const dbClient = await MongoDbConnection().Get()
        const projectExists = await dbClient.db(mongodbConfig.primary.db)
        .collection(mongodbConfig.primary.collections.projects)
        .countDocuments({"_id":new ObjectId(projectId)})
        if (!projectExists) res.status(400).send("Project Id isn't correct")
        if (next) next()
    }catch(err){
        console.log(err)
        let msg = "Internal Server Error";
        if (err instanceof Error) {
            msg = err.message;
        } else if (err) {
            msg = err as string;
        }
        res.status(400).json({ errorMsg: msg, error: true });
    }
}
export default validateProjectId