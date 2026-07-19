import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import listBuildingsTool from "./tools/list-buildings";
import listUnitsTool from "./tools/list-units";
import listTicketsTool from "./tools/list-tickets";
import createTicketTool from "./tools/create-ticket";
import listAmenitiesTool from "./tools/list-amenities";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "proppass-mcp",
  title: "PropPass MCP",
  version: "0.1.0",
  instructions:
    "Herramientas para PropPass, la plataforma de gestión de edificios residenciales. Usa `whoami` para verificar el usuario, `list_buildings` para descubrir edificios, y las demás herramientas para consultar unidades, amenidades y tickets, o crear tickets nuevos.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    whoamiTool,
    listBuildingsTool,
    listUnitsTool,
    listTicketsTool,
    createTicketTool,
    listAmenitiesTool,
  ],
});
