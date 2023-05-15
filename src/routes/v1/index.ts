import { Router } from "express";
import projectRoutes from "./projectRoutes";
import authRoutes from "./authRoutes";

const appRouter = Router();

// all routes
const appRoutes = [
  {
    path:"/auth",
    router:authRoutes,
  },
  {
    path:"/projects",
    router:projectRoutes
  },
];

appRoutes.forEach(route => {
  appRouter.use(route.path, route.router);
});

export default appRouter;
