import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getInitials } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

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
    updated_at: string;
}

export const UserProfile = ({ userId }: UserProfileProps) => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [history, setHistory] = useState<ReadingHistory[]>([]);
    const { toast } = useToast();

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
            const { data, error } = await supabase
                .from('documents')
                .select('id, title, completed_at, is_completed, updated_at')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false })
                .limit(10);

            if (error) {
                console.error("Error fetching history:", error);
                toast({
                    title: "Unable to load reading history",
                    description: "You may need to apply the database policy update. Check the console for details.",
                    variant: "destructive"
                });
            }
            if (data) setHistory(data as ReadingHistory[]);
        };

        fetchProfile();
        fetchHistory();
    }, [userId, toast]);

    if (!profile) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Profile...</div>;

    const reading = history.filter(doc => !doc.is_completed);
    const finished = history.filter(doc => doc.is_completed);

    return (
        <div className="flex flex-col">
            <div className="flex flex-col items-center mb-6">
                <Avatar className="h-20 w-20 mb-3 border-2 border-border shadow-sm">
                    <AvatarImage src={profile.avatar_url || ''} className="object-cover" />
                    <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">
                        {getInitials(profile.display_name)}
                    </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-display text-foreground uppercase tracking-tight">{profile.display_name}</h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">KiN since {new Date(profile.created_at).getFullYear()}</p>
            </div>

            <Separator className="mb-4" />

            <div className="space-y-6">
                {/* Currently Reading */}
                <div>
                    <h4 className="text-[10px] font-bold text-primary mb-3 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        Currently Reading
                    </h4>
                    <div className="space-y-1.5">
                        {reading.length > 0 ? (
                            reading.map(doc => (
                                <div key={doc.id} className="text-sm p-3 rounded-xl bg-secondary/40 border border-border/50 group">
                                    <p className="text-foreground font-medium truncate">{doc.title}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        Last read {new Date(doc.updated_at).toLocaleDateString()}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-muted-foreground italic px-2">Nothing in the library right now.</p>
                        )}
                    </div>
                </div>

                {/* Recently Finished */}
                <div>
                    <h4 className="text-[10px] font-bold text-muted-foreground mb-3 uppercase tracking-[0.2em]">Recently Finished</h4>
                    <ScrollArea className={finished.length > 3 ? "h-32 pr-2" : ""}>
                        <div className="space-y-1.5">
                            {finished.length > 0 ? (
                                finished.map(doc => (
                                    <div key={doc.id} className="text-sm p-2.5 rounded-lg bg-secondary/20 border border-transparent hover:border-border/50 transition-all duration-200">
                                        <p className="text-foreground/80 truncate">{doc.title}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            Finished {doc.completed_at ? new Date(doc.completed_at).toLocaleDateString() : 'recently'}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-muted-foreground italic px-2">No finished TXTs to show.</p>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
};
