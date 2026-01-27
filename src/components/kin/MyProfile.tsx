import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { getInitials } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Edit2, X } from "lucide-react";

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

        fetchProfile();
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
                        <div className="flex items-center gap-1 w-full">
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
                    <div className="flex items-center gap-2 group">
                        <h3 className="text-xl font-display text-foreground uppercase tracking-tight">
                            {profile.display_name || "Anonymous User"}
                        </h3>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                            onClick={() => setIsEditing(true)}
                        >
                            <Edit2 className="h-3 w-3" />
                        </Button>
                    </div>
                )}

                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                    K<span className="lowercase font-sans text-[10px] relative -top-[0.5px]">i</span>N since {new Date(profile.created_at).getFullYear()}
                </p>
            </div>

            <Separator className="mb-6" />

            <div className="space-y-6">
                <div>
                    <h4 className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-[0.2em]">Email Address</h4>
                    <p className="text-sm text-foreground font-medium p-3 rounded-xl bg-secondary/30 border border-border/40 select-all">
                        {profile.email}
                    </p>
                    <p className="text-[9px] text-muted-foreground italic mt-1.5 px-1">
                        Email address cannot be changed.
                    </p>
                </div>

                <div>
                    <h4 className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-[0.2em]">Member Details</h4>
                    <div className="p-3 rounded-xl bg-secondary/10 border border-border/20 text-xs space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Joined</span>
                            <span className="text-foreground font-medium">{new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">KiN ID</span>
                            <span className="text-[10px] font-mono text-muted-foreground/60">{profile.id.substring(0, 8)}...</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
