import express from "express";
import logger from "morgan";
import cors from "cors";
import appRouter from "./routes/v1";
import bodyParser from "body-parser";

// Create Express server
const app = express();

app.use(logger("dev"));
app.set("port", process.env.PORT || 3000);
app.use(express.text({type:"application/xml"}))
app.use(express.text({type:"text/plain"}))
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

/**
 * Primary app routes.
 */

app.use("/api/v1", appRouter);


export default app;
