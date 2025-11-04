import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSession } from "@/contexts/SessionContext";
import { useBuilding } from "@/contexts/BuildingContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, MessageSquare, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FeedPost {
  id: string;
  author_name: string;
  author_role: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author_id: string;
}

export default function Feed() {
  const { profile } = useAuth();
  const { session, loading: sessionLoading } = useSession();
  const { currentBuildingId } = useBuilding();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Loop prevention guard for /feed route
  useEffect(() => {
    if (sessionLoading) return;
    
    // Allow if accessing via building route (managers/admins viewing building feed)
    if (currentBuildingId) return;
    
    // Redirect to auth if not authenticated
    if (!session) {
      navigate('/auth');
      return;
    }
    
    // For standalone /feed route - residents stay, others redirect
    if (session.role === 'resident') {
      // Do nothing - resident is on correct page
      return;
    } else if (session.role === 'manager') {
      navigate('/manager');
    } else if (session.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/auth');
    }
  }, [session, sessionLoading, currentBuildingId, navigate]);

  useEffect(() => {
    if (currentBuildingId) {
      loadPosts();
      subscribeToUpdates();
    }
  }, [currentBuildingId]);

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel('feed-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feed_posts',
          filter: `building_id=eq.${currentBuildingId}`
        },
        () => {
          loadPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('feed_posts')
        .select('*')
        .eq('building_id', currentBuildingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading feed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in title and content",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('feed_posts')
        .insert({
          building_id: currentBuildingId,
          author_id: profile?.id,
          author_name: profile?.name || profile?.email || 'Anonymous',
          author_role: profile?.role || 'resident',
          title: title,
          content: content
        });

      if (error) throw error;

      toast({
        title: "Post published",
        description: "Your post has been shared with the building",
      });

      setTitle("");
      setContent("");
      setDialogOpen(false);
      loadPosts();
    } catch (error: any) {
      toast({
        title: "Error creating post",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('feed_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast({
        title: "Post deleted",
        description: "Your post has been removed",
      });

      loadPosts();
    } catch (error: any) {
      toast({
        title: "Error deleting post",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!currentBuildingId) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>No Building Selected</CardTitle>
              <CardDescription>
                Please select a building to view the community feed
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Debug Info */}
        <div className="mb-4 p-3 bg-muted/50 rounded-md text-xs font-mono space-y-1">
          <div><strong>Email:</strong> {profile?.email || 'N/A'}</div>
          <div><strong>Role:</strong> {session?.role || 'N/A'}</div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Community Feed</h1>
            <p className="text-muted-foreground mt-1">
              Stay updated with building news and announcements
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Post
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a Post</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What's your post about?"
                  />
                </div>
                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Share your message with the community..."
                    rows={6}
                  />
                </div>
                <Button
                  onClick={handleCreatePost}
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? "Publishing..." : "Publish Post"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading feed...</div>
        ) : (
          <div className="space-y-4">
            {posts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => (
                <Card key={post.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="mb-2">{post.title}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <span className="font-medium">{post.author_name}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            post.author_role === 'manager' 
                              ? 'bg-primary/10 text-primary' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {post.author_role}
                          </span>
                          <span className="flex items-center text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          </span>
                        </CardDescription>
                      </div>
                      {post.author_id === profile?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{post.content}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
