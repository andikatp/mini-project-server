import { Router } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { APP_CONFIG } from "../configs/app.config.ts";

const baseDefinition = {
  openapi: "3.1.0",
  servers: [{ url: "/api/v1" }],
};

// Each definition targets specific route files via the `apis` glob
const definitions: Record<string, ReturnType<typeof swaggerJsdoc>> = {
  "Auth Service": swaggerJsdoc({
    definition: {
      ...baseDefinition,
      info: { title: "Auth Service", version: APP_CONFIG.version },
    },
    apis: ["./src/routes/auth.route.ts"],
  }),
  "User Service": swaggerJsdoc({
    definition: {
      ...baseDefinition,
      info: { title: "User Service", version: APP_CONFIG.version },
    },
    apis: ["./src/routes/user.route.ts"],
  }),
};

const definitionNames = Object.keys(definitions);

export const swaggerMiddleware = [
  swaggerUi.serve,
  swaggerUi.setup(definitions[definitionNames[0]!], {
    explorer: true,
    swaggerOptions: {
      urls: definitionNames.map((name) => ({
        url: `/docs/${encodeURIComponent(name)}/swagger.json`,
        name,
      })),
    },
  }),
];

export function getSwaggerSpec(name: string) {
  return definitions[name] ?? null;
}

export const swaggerRouter = Router();

swaggerRouter.get("/:name/swagger.json", (req, res) => {
  const spec = getSwaggerSpec(decodeURIComponent(req.params.name));
  if (!spec) return res.status(404).json({ error: "Definition not found" });
  res.json(spec);
});

swaggerRouter.use("/", ...swaggerMiddleware);
