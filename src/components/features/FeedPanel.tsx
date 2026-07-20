import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Pin, PinOff, Trash2 } from "lucide-react";

interface Post {
  id: string;
  author_id: string;
  body: string;
  pinned: boolean;
  created_at: string;
  author_name?: string;
}

export function FeedPanel({ buildingId, isBoard }: { buildingId: string; isBoard: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data: p } = await supabase
      .from("posts")
      .select("id, author_id, body, pinned, created_at")
      .eq("building_id", buildingId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    const rows = (p ?? []) as Post[];
    const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
    if (authorIds.length) {
      const { data: mem } = await supabase
        .from("memberships")
        .select("user_id, resident_name, role")
        .in("user_id", authorIds);
      const map = new Map<string, string>();
      (mem ?? []).forEach((m: any) => {
        if (!map.has(m.user_id)) map.set(m.user_id, m.resident_name || (m.role === "admin_board" ? "Administración" : m.role));
      });
      rows.forEach((r) => (r.author_name = map.get(r.author_id) || "Usuario"));
    }
    setPosts(rows);
  };

  useEffect(() => { load(); }, [buildingId]);

  const submit = async () => {
    if (!body.trim() || !user) return;
    setBusy(true);
    const { error } = await supabase.from("posts").insert({
      building_id: buildingId,
      author_id: user.id,
      body: body.trim(),
      pinned: isBoard ? pinned : false,
    });
    setBusy(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setBody(""); setPinned(false); load();
  };

  const togglePin = async (p: Post) => {
    const { error } = await supabase.from("posts").update({ pinned: !p.pinned }).eq("id", p.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else load();
  };

  const remove = async (p: Post) => {
    const { error } = await supabase.from("posts").delete().eq("id", p.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Publicar</CardTitle>
          <CardDescription>Comparte una novedad con el edificio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escribe algo..." rows={3} />
          <div className="flex items-center justify-between">
            {isBoard ? (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
                Fijar anuncio
              </label>
            ) : <span />}
            <Button onClick={submit} disabled={busy || !body.trim()}>Publicar</Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {posts.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aún no hay publicaciones.</p>}
        {posts.map((p) => (
          <Card key={p.id} className={p.pinned ? "border-primary" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{p.author_name}</span>
                    {p.pinned && <Badge variant="default"><Pin className="h-3 w-3 mr-1" />Fijado</Badge>}
                    <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("es-PE")}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{p.body}</p>
                </div>
                <div className="flex gap-1">
                  {isBoard && (
                    <Button variant="ghost" size="icon" onClick={() => togglePin(p)}>
                      {p.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    </Button>
                  )}
                  {(isBoard || p.author_id === user?.id) && (
                    <Button variant="ghost" size="icon" onClick={() => remove(p)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
