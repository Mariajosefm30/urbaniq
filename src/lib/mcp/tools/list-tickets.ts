import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "list_tickets",
  title: "Listar tickets",
  description:
    "Lista los tickets de mantenimiento de un edificio, opcionalmente filtrados por estado.",
  inputSchema: {
    building_id: z.string().uuid().describe("ID del edificio"),
    status: z
      .string()
      .optional()
      .describe("Estado opcional (open, in_progress, resolved, closed)"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ building_id, status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    let query = sb(ctx)
      .from("tickets")
      .select("*")
      .eq("building_id", building_id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { tickets: data ?? [] },
    };
  },
});
