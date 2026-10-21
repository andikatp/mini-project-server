import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { APP_CONFIG } from "../configs/app.config.ts";

const baseDefinition = {
  openapi: "3.0.0",
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

  // Add more definitions here as you create new route files, e.g.:
  // "User Service": swaggerJsdoc({
  //   definition: {
  //     ...baseDefinition,
  //     info: { title: "User Service", version: APP_CONFIG.version },
  //   },
  //   apis: ["./src/routes/user.route.ts"],
  // }),
};

const definitionNames = Object.keys(definitions);

export const swaggerMiddleware = [
  swaggerUi.serve,
  swaggerUi.setup(definitions[definitionNames[0]!], {
    explorer: true,
    swaggerOptions: {
      urls: definitionNames.map((name) => ({
        url: `/api-docs/${encodeURIComponent(name)}/swagger.json`,
        name,
      })),
    },
  }),
];

// Returns the raw JSON spec for a given definition name
export function getSwaggerSpec(name: string) {
  return definitions[name] ?? null;
}
