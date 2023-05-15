import { MongoClient } from "mongodb";
import {Pool} from 'pg';

export const MongoDbConnection = function () {

    let db: MongoClient | null = null;
    let instance = 0;

    async function DbConnect() {
        try {
            let url = 'mongodb://localhost:27017';
            let _db = await MongoClient.connect(url);

            return _db
        } catch (e) {
            return e;
        }
    }

   async function Get():Promise<MongoClient> {
        try {
            instance++;     // this is just to count how many times our singleton is called.
            console.log(`DbConnection called ${instance} times`);

            if (db != null) {
                console.log(`db connection is already alive`);
                return db;
            } else {
                console.log(`getting new db connection`);
                db = await DbConnect() as MongoClient;
                return db; 
            }
        } catch (e) {
            return e as any
        }
    }

    return {
        Get: Get
    }
}



export const PostgresConnection = function () {

    let db: Pool | null = null;
    let instance = 0;

    async function DbConnect() {
        try {
            let _db = new Pool({
                user: 'postgres',
                host: 'localhost',
                database: 'gis-pakistan',
                password: '123456789',
                port: 5432,
            })
            
            return _db
        } catch (e) {
            return e;
        }
    }

   async function Get():Promise<Pool> {
        try {
            instance++;     // this is just to count how many times our singleton is called.
            console.log(`PostGres Connection called ${instance} times`);

            if (db != null) {
                console.log(`db connection is already alive`);
                return db;
            } else {
                console.log(`getting new db connection`);
                db = await DbConnect() as Pool;
                return db; 
            }
        } catch (e) {
            return e as any;
        }
    }

    return {
        Get: Get
    }
}
