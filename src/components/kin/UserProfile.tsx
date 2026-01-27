import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getInitials } from "@/lib/utils";

interface UserProfileProps {
    userId: string;
}

interface Profile {
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
}

interface ReadingHistory {
    id: string;
    title: string;
    completed_at: string | null;
    is_completed: boolean;
}

export const UserProfile = ({ userId }: UserProfileProps) => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [history, setHistory] = useState<ReadingHistory[]>([]);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            if (data) setProfile(data);
        };

        const fetchHistory = async () => {
            const { data } = await supabase
                .from('documents')
                .select('id, title, completed_at, is_completed')
                .eq('user_id', userId)
                .eq('is_completed', true) // Only show completed books
                .order('completed_at', { ascending: false })
                .limit(5);

            if (data) setHistory(data);
        };

        fetchProfile();
        fetchHistory();
    }, [userId]);

    if (!profile) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Profile...</div>;

    return (
        <div className="flex flex-col">
            <div className="flex flex-col items-center mb-6">
                <Avatar className="h-20 w-20 mb-3 border-2 border-border shadow-sm">
                    <AvatarImage src={profile.avatar_url || ''} className="object-cover" />
                    <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">
                        {getInitials(profile.display_name)}
                    </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-display text-foreground">{profile.display_name}</h3>
                <p className="text-xs text-muted-foreground">Member since {new Date(profile.created_at).getFullYear()}</p>
            </div>

            <Separator className="mb-4" />

            <div>
                <h4 className="text-[10px] font-bold text-muted-foreground mb-3 uppercase tracking-[0.2em]">Recently Read</h4>
                <ScrollArea className="h-40 pr-4">
                    {history.length > 0 ? (
                        <div className="space-y-1.5">
                            {history.map(doc => (
                                <div key={doc.id} className="text-sm p-2.5 rounded-lg bg-secondary/30 border border-transparent hover:border-border hover:bg-secondary/50 transition-all duration-200 group">
                                    <p className="text-foreground font-medium truncate group-hover:text-primary transition-colors">{doc.title}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        {doc.completed_at ? new Date(doc.completed_at).toLocaleDateString() : 'Recently'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center grayscale opacity-50">
                            <p className="text-xs text-muted-foreground italic">No reading history shared.</p>
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    );
};
