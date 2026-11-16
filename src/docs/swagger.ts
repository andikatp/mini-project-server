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
  "All APIs": swaggerJsdoc({
    definition: {
      ...baseDefinition,
      info: { title: "All API Endpoints", version: APP_CONFIG.version },
    },
    apis: ["./src/routes/*.ts"],
  }),
  "Auth Service": swaggerJsdoc({
    definition: {
      ...baseDefinition,
      info: { title: "Auth Service", version: APP_CONFIG.version },
    },
    apis: ["./src/routes/auth.route.ts"],
  }),
  "Event & Review": swaggerJsdoc({
    definition: {
      ...baseDefinition,
      info: { title: "Event & Review Service", version: APP_CONFIG.version },
    },
    apis: ["./src/routes/event.route.ts", "./src/routes/review.route.ts"],
  }),
  "Transaction & Checkout": swaggerJsdoc({
    definition: {
      ...baseDefinition,
      info: { title: "Transaction & Checkout Service", version: APP_CONFIG.version },
    },
    apis: ["./src/routes/transaction.route.ts", "./src/routes/checkout.route.ts"],
  }),
  "Organizer Service": swaggerJsdoc({
    definition: {
      ...baseDefinition,
      info: { title: "Organizer Service", version: APP_CONFIG.version },
    },
    apis: ["./src/routes/organizer.route.ts"],
  }),
  "User & Reward": swaggerJsdoc({
    definition: {
      ...baseDefinition,
      info: { title: "User & Reward Service", version: APP_CONFIG.version },
    },
    apis: [
      "./src/routes/user.route.ts",
      "./src/routes/reward.route.ts",
      "./src/routes/upload.route.ts",
    ],
  }),
};

const definitionNames = Object.keys(definitions);

const swaggerMiddleware = [
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

function getSwaggerSpec(name: string) {
  return definitions[name] ?? null;
}

export const swaggerRouter = Router();

swaggerRouter.get("/:name/swagger.json", (req, res) => {
  const spec = getSwaggerSpec(decodeURIComponent(req.params.name));
  if (!spec) return res.status(404).json({ error: "Definition not found" });
  return res.json(spec);
});

swaggerRouter.use("/", ...swaggerMiddleware);
