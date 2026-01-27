import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { getInitials } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Edit2, X, BookOpen, Users } from "lucide-react";

interface Profile {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    email: string | null;
    created_at: string;
}

export const MyProfile = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [newDisplayName, setNewDisplayName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const [stats, setStats] = useState({ kinCount: 0, txtReadCount: 0 });

    useEffect(() => {
        if (!user) return;

        const fetchProfile = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error("Error fetching profile:", error);
                return;
            }

            if (data) {
                setProfile(data);
                setNewDisplayName(data.display_name || "");
            }
        };

        const fetchStats = async () => {
            // Count KiN connections
            const { count: kinCount } = await supabase
                .from('kin_connections')
                .select('*', { count: 'exact', head: true })
                .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
                .eq('status', 'accepted');

            // Count TXTs read
            const { count: txtReadCount } = await supabase
                .from('documents')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_completed', true);

            setStats({
                kinCount: kinCount || 0,
                txtReadCount: txtReadCount || 0
            });
        };

        fetchProfile();
        fetchStats();
    }, [user]);

    const handleUpdateDisplayName = async () => {
        if (!user || !profile || !newDisplayName.trim()) return;
        setIsSaving(true);

        try {
            const { data, error } = await supabase
                .from('profiles')
                .update({ display_name: newDisplayName.trim() })
                .eq('id', user.id)
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setProfile(data);
                setNewDisplayName(data.display_name || "");
            }
            setIsEditing(false);
            toast({
                title: "Profile Updated",
                description: "Your display name has been changed.",
            });
        } catch (error) {
            console.error("Error updating profile:", error);
            toast({
                title: "Update Failed",
                description: "Could not update display name. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (!profile) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Profile...</div>;

    return (
        <div className="flex flex-col p-6">
            <div className="flex flex-col items-center mb-6">
                <Avatar className="h-20 w-20 mb-3 border-2 border-border shadow-sm">
                    <AvatarImage src={profile.avatar_url || ''} className="object-cover" />
                    <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">
                        {getInitials(profile.display_name)}
                    </AvatarFallback>
                </Avatar>

                {isEditing ? (
                    <div className="flex flex-col items-center w-full max-w-[240px] gap-2">
                        <div className="flex items-center gap-1 w-full justify-center">
                            <Input
                                value={newDisplayName}
                                onChange={(e) => setNewDisplayName(e.target.value)}
                                className="bg-secondary/50 border-border text-foreground font-display text-center uppercase tracking-tight h-9"
                                autoFocus
                            />
                            <div className="flex items-center">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-primary hover:bg-primary/10"
                                    onClick={handleUpdateDisplayName}
                                    disabled={isSaving}
                                >
                                    <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-muted-foreground hover:bg-secondary"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setNewDisplayName(profile.display_name || "");
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center gap-2 group w-full text-center">
                        <div className="relative flex items-center justify-center">
                            <h3 className="text-xl font-display text-foreground uppercase tracking-tight text-center">
                                {profile.display_name || "Anonymous User"}
                            </h3>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="absolute -right-8 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                                onClick={() => setIsEditing(true)}
                            >
                                <Edit2 className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                )}

                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                    K<span className="lowercase font-sans text-[10px] relative -top-[0.5px]">i</span>N since {new Date(profile.created_at).getFullYear()}
                </p>
            </div>

            <Separator className="mb-6" />

            <div className="space-y-6">
                {/* Stats Section */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-secondary/20 border border-border/40 flex flex-col items-center justify-center text-center">
                        <Users className="h-4 w-4 text-primary mb-1.5 opacity-70" />
                        <span className="text-xl font-display text-foreground">{stats.kinCount}</span>
                        <span className="text-[10px] text-muted-foreground tracking-wider font-bold">K<span className="lowercase font-sans text-[10px] relative -top-[0.5px]">i</span>N<span className="lowercase font-sans">s</span></span>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/20 border border-border/40 flex flex-col items-center justify-center text-center">
                        <BookOpen className="h-4 w-4 text-primary mb-1.5 opacity-70" />
                        <span className="text-xl font-display text-foreground">{stats.txtReadCount}</span>
                        <span className="text-[10px] text-muted-foreground tracking-wider font-bold">TXT<span className="lowercase font-sans">s</span> READ</span>
                    </div>
                </div>

                <div>
                    <h4 className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-[0.2em]">Email Address</h4>
                    <p className="text-sm text-muted-foreground font-medium p-3 rounded-xl bg-secondary/10 border border-border/20 select-all">
                        {profile.email}
                    </p>
                </div>

                <div>
                    <h4 className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-[0.2em]">Member Details</h4>
                    <div className="p-3 rounded-xl bg-secondary/10 border border-border/20 text-xs space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Joined</span>
                            <span className="text-foreground font-medium">{new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
