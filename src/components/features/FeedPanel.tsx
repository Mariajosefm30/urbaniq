import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Pin, PinOff, Trash2, MessageSquare } from "lucide-react";
import { PollsSection } from "./PollsSection";

interface Post {
  id: string;
  author_id: string;
  body: string;
  pinned: boolean;
  created_at: string;
  author_name?: string;
}

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author_name?: string;
}

export function FeedPanel({ buildingId, isBoard, polls }: {
  buildingId: string;
  isBoard: boolean;
  polls?: { enabled: boolean; canCreate: boolean; canClose: boolean; ownerUnitIds: string[]; totalOwnerUnits: number };
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);

  const nameMap = async (userIds: string[]) => {
    const map = new Map<string, string>();
    if (!userIds.length) return map;
    const { data: mem } = await supabase
      .from("memberships")
      .select("user_id, resident_name, role")
      .in("user_id", userIds);
    (mem ?? []).forEach((m: any) => {
      if (!map.has(m.user_id))
        map.set(m.user_id, m.resident_name || (m.role === "admin_board" ? "Administración" : m.role));
    });
    return map;
  };

  const load = async () => {
    const { data: p } = await supabase
      .from("posts")
      .select("id, author_id, body, pinned, created_at")
      .eq("building_id", buildingId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    const rows = (p ?? []) as Post[];
    const postIds = rows.map((r) => r.id);

    const { data: cs } = postIds.length
      ? await supabase
          .from("post_comments")
          .select("id, post_id, author_id, body, created_at")
          .in("post_id", postIds)
          .order("created_at", { ascending: true })
      : { data: [] as any[] };
    const commentRows = (cs ?? []) as Comment[];

    const allUserIds = Array.from(new Set([...rows.map((r) => r.author_id), ...commentRows.map((c) => c.author_id)]));
    const map = await nameMap(allUserIds);
    rows.forEach((r) => (r.author_name = map.get(r.author_id) || "Usuario"));
    commentRows.forEach((c) => (c.author_name = map.get(c.author_id) || "Usuario"));

    const grouped: Record<string, Comment[]> = {};
    commentRows.forEach((c) => {
      (grouped[c.post_id] ||= []).push(c);
    });

    setPosts(rows);
    setComments(grouped);
  };

  useEffect(() => {
    load();
  }, [buildingId]);

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
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setBody("");
    setPinned(false);
    load();
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

  const sendComment = async (postId: string) => {
    const text = (drafts[postId] || "").trim();
    if (!text || !user) return;
    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      building_id: buildingId,
      author_id: user.id,
      body: text,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setDrafts((d) => ({ ...d, [postId]: "" }));
    load();
  };

  const removeComment = async (c: Comment) => {
    const { error } = await supabase.from("post_comments").delete().eq("id", c.id);
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
            ) : (
              <span />
            )}
            <Button onClick={submit} disabled={busy || !body.trim()}>
              Publicar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {posts.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Aún no hay publicaciones.</p>
        )}
        {posts.map((p) => {
          const list = comments[p.id] || [];
          const open = openComments[p.id];
          return (
            <Card key={p.id} className={p.pinned ? "border-primary" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{p.author_name}</span>
                      {p.pinned && (
                        <Badge variant="default">
                          <Pin className="h-3 w-3 mr-1" />
                          Fijado
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleString("es-PE")}
                      </span>
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

                <div className="mt-3 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpenComments((o) => ({ ...o, [p.id]: !o[p.id] }))}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    {list.length} {list.length === 1 ? "comentario" : "comentarios"}
                  </Button>

                  {open && (
                    <div className="mt-2 space-y-2">
                      {list.map((c) => (
                        <div key={c.id} className="flex items-start justify-between gap-2 rounded-md bg-muted/50 p-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{c.author_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(c.created_at).toLocaleString("es-PE")}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                          </div>
                          {(isBoard || c.author_id === user?.id) && (
                            <Button variant="ghost" size="icon" onClick={() => removeComment(c)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Escribe un comentario..."
                          value={drafts[p.id] || ""}
                          onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              sendComment(p.id);
                            }
                          }}
                        />
                        <Button size="sm" onClick={() => sendComment(p.id)} disabled={!(drafts[p.id] || "").trim()}>
                          Enviar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
