import { Router } from "express";
import { createPublicRequest } from "../../request";
import { omit } from "lodash";
import { sign } from "../../util/jwt";
import { compareSync, encryptSync } from "../../util/encrypt";
import Joi from "joi";
import { mongodbConfig } from "../../config/config";

const authRoutes = Router()
.post("/register", createPublicRequest({
  input: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
  }),
  resolve:async ({req, res, connections}) => {
    let {email, password} = req.body;
    const UsersCollection = connections.MongoClient.db(mongodbConfig.primary.db).collection(mongodbConfig.primary.collections.users)
    const userExist = await UsersCollection.findOne({email:email})
    if (userExist) throw new Error("Email is alredy used")
    
    const user = await UsersCollection.insertOne({
      email, 
      password:encryptSync(password)
    });
    const accessToken = sign({ id:user.insertedId });
    return res.status(200).json({
      data: user,
      error: false,
      accessToken,
      msg: "User registered successfully",
    });
  }
}))

.post("/login", createPublicRequest({
  input: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
  }),
  resolve: async ({req, res, connections}) => {
    const { email, password } = req.body
    const UsersCollection = connections.MongoClient.db(mongodbConfig.primary.db).collection(mongodbConfig.primary.collections.users)
    const user = await UsersCollection.findOne({email:email})
    if (!user) throw new Error("Email or password is incorrect")
    if (!compareSync(password,user.password)) throw new Error("Email or password is incorrect")
    
    const userData = omit(user, ["password"])
    const accessToken = sign({ id:userData._id })
    return res.status(200).json({
      data: userData,
      access_token: accessToken,
      error: false,
    });

  }
}));

export default authRoutes;

