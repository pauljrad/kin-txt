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

    const [stats, setStats] = useState({ total: 0, byType: { article: 0, ebook: 0, document: 0, link: 0 } });

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
                .select('id, title, completed_at, is_completed, updated_at, source')
                .eq('user_id', userId);

            if (error) {
                console.error("Error fetching history:", error);
                return;
            }

            if (data) {
                // Calculate Stats
                const completed = data.filter(d => d.is_completed);
                const newStats = {
                    total: completed.length,
                    byType: {
                        article: completed.filter(d => d.source === 'article').length,
                        ebook: completed.filter(d => d.source === 'ebook').length,
                        document: completed.filter(d => d.source === 'document' || d.source === 'text').length,
                        link: completed.filter(d => d.source === 'link').length,
                    }
                };
                setStats(newStats);

                // Set History Lists
                // Sort by update time for both
                const sorted = data.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
                setHistory(sorted as any);
            }
        };

        fetchProfile();
        fetchHistory();
    }, [userId, toast]);

    if (!profile) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Profile...</div>;

    const reading = history.filter(doc => !doc.is_completed).slice(0, 3); // Limit to 3 recent
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
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">K<span className="lowercase font-sans text-[10px] relative -top-[0.5px]">i</span>N since {new Date(profile.created_at).getFullYear()}</p>
            </div>

            <Separator className="mb-6" />

            {/* Reading Stats */}
            <div className="grid grid-cols-4 gap-2 mb-6">
                <div className="col-span-4 bg-secondary/20 rounded-lg p-3 text-center mb-2">
                    <span className="block text-2xl font-bold font-display text-primary">{stats.total}</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">XTs Read</span>
                </div>
                {[
                    { label: 'Arts', count: stats.byType.article },
                    { label: 'Books', count: stats.byType.ebook },
                    { label: 'Docs', count: stats.byType.document },
                    { label: 'Links', count: stats.byType.link }
                ].map(stat => (
                    <div key={stat.label} className="bg-secondary/10 rounded-md p-2 text-center">
                        <span className="block text-sm font-bold">{stat.count}</span>
                        <span className="text-[8px] uppercase tracking-wider text-muted-foreground">{stat.label}</span>
                    </div>
                ))}
            </div>

            <div className="space-y-6">
                {/* Currently Reading */}
                <div>
                    <h4 className="text-[10px] font-bold text-primary mb-3 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        Reading Now
                    </h4>
                    <div className="space-y-1.5">
                        {reading.length > 0 ? (
                            reading.map(doc => (
                                <div key={doc.id} className="text-xs p-2.5 rounded-lg bg-secondary/40 border border-border/50 group">
                                    <p className="text-foreground font-medium truncate">{doc.title}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-muted-foreground italic px-2">Nothing current.</p>
                        )}
                    </div>
                </div>

                {/* Recently Finished */}
                <div>
                    <h4 className="text-[10px] font-bold text-muted-foreground mb-3 uppercase tracking-[0.2em]">History</h4>
                    <ScrollArea className="h-32 pr-2 border rounded-md border-border/20 bg-secondary/5">
                        <div className="p-2 space-y-1.5">
                            {finished.length > 0 ? (
                                finished.map(doc => (
                                    <div key={doc.id} className="text-xs p-2 rounded bg-background/50 border border-transparent hover:border-border/30 transition-all">
                                        <p className="text-foreground/80 truncate">{doc.title}</p>
                                        <p className="text-[8px] text-muted-foreground mt-0.5">
                                            {doc.completed_at ? new Date(doc.completed_at).toLocaleDateString() : 'Finished'}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-muted-foreground italic p-2">No history yet.</p>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
};
