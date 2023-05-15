import { NextFunction, Request, Response } from "express";
import { Schema } from "joi";
import { MongoClient } from "mongodb";
import { get } from "lodash";
import { verify } from "./util/jwt";
import { MongoDbConnection, PostgresConnection } from "./db";
import { Pool } from "pg";

interface customRequest extends Request {
    user: any;
}
interface Context{
    req:Request,
    res:Response,
    connections:{
        MongoClient:MongoClient,
        PostGres:Pool
    }
}
interface Params {
    input?:Schema,
    middlewares?:Array<(req: Request, res: Response, next?: NextFunction) => void>
    resolve:(ctx:Context) => Promise<any>
}

// Middlewares
const validateRequest = (schema?:Schema) => {
    return async (
        req: Request,
        res: Response,
        next:NextFunction
      ):Promise<void> => {
        if (!schema) {
            next()
        }else {
            const { error,value } = schema.validate(req.body);
            const valid = error == null;
            if (valid) {
                req.body = value
                next()
            } else {
                const { details, message } = error;
                const messages = details.map(i => i.message).join(",");
                console.log("error", messages);
                res.status(400).json({ error: messages, msg: message })
            }
        }   
    }        
}
const deserializeUser = async (
    req: Request,
    res: Response,
    next:NextFunction
  ):Promise<void> => {
    const bearerToken = get(req, "headers.authorization");
    let token = bearerToken;
    if (bearerToken && bearerToken.startsWith("Bearer ")) {
      token = bearerToken.substring(7);
    }
    if (!token) 
        next();
  
    const { decoded, expired, valid, msg: errorMsg } = verify(token);
    console.log(decoded, valid) 
    if (valid && !expired) {
      res.locals.user = decoded;
      next();
    } else {
      res.status(403).json({
        error: true,
        errorMsg: errorMsg,
      });
    }
}
const requireUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ):Promise<void> => {
    try {
      const user: any = get(res.locals, "user");
  
      if (!user) {
        res.status(403).json({ errorMsg: "Auth token user not found", error: true });
      }else {
        next();
      } 
    } catch (err) {
      let msg = "Internal Server Error";
      if (err instanceof Error) {
        msg = err.message;
      } else if (err) {
        msg = err as string;
      }
      res.status(400).json({ errorMsg: msg, error: true });
    }
};

// Two types of Request
export const createPublicRequest = ({input, resolve, middlewares}:Params) => {
    return [
        validateRequest(input),
        ...(middlewares ? middlewares:[]),
        async(req:Request, res:Response) => {
            try {
                const postgres = await PostgresConnection().Get()
                const mongo = await MongoDbConnection().Get()
                await resolve({
                    req,res,
                    connections:{
                        MongoClient:mongo,
                        PostGres:postgres
                    }
                })
                mongo.close()
            } catch (err) {
                console.log(err)
                let msg = "Internal Server Error";
                if (err instanceof Error) {
                    msg = err.message;
                } else if (err) {
                    msg = err as string;
                }
                return res.status(400).json({ errorMsg: msg, error: true });
            }
        }
    ]
}
export const createProtectedRequest = ({input, resolve, middlewares}:Params) => {
    return ([
        deserializeUser,
        requireUser,
        validateRequest(input),
        ...(middlewares ? middlewares:[]),
        async(req:Request, res:Response) => {
            try {
                const postgres = await PostgresConnection().Get()
                const mongo = await MongoDbConnection().Get()
                await resolve({
                    req,res,
                    connections:{
                        MongoClient:mongo,
                        PostGres:postgres
                    }
                })
                mongo.close()
                
            } catch (err) {
                console.log(err)
                let msg = "Internal Server Error";
                if (err instanceof Error) {
                    msg = err.message;
                } else if (err) {
                    msg = err as string;
                }
                return res.status(400).json({ errorMsg: msg, error: true });
            }
        }
    ])
}
