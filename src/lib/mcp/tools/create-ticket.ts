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
  name: "create_ticket",
  title: "Crear ticket",
  description: "Crea un ticket de mantenimiento en un edificio.",
  inputSchema: {
    building_id: z.string().uuid().describe("ID del edificio"),
    title: z.string().trim().min(1).max(200).describe("Título del ticket"),
    description: z.string().trim().min(1).max(2000).describe("Descripción del problema"),
    priority: z
      .enum(["low", "medium", "high", "urgent"])
      .optional()
      .describe("Prioridad opcional"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ building_id, title, description, priority }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const { data, error } = await sb(ctx)
      .from("tickets")
      .insert({
        building_id,
        title,
        description,
        priority: priority ?? "medium",
        created_by: ctx.getUserId(),
        status: "open",
      })
      .select()
      .single();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { ticket: data },
    };
  },
});
