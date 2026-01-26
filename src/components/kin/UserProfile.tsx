import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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

    if (!profile) return <div>Loading...</div>;

    return (
        <div className="p-4 bg-zinc-900/50 rounded-lg border border-white/5">
            <div className="flex flex-col items-center mb-6">
                <Avatar className="h-20 w-20 mb-3 border-2 border-white/10">
                    <AvatarImage src={profile.avatar_url || ''} />
                    <AvatarFallback className="text-xl">{profile.display_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-serif text-white">{profile.display_name}</h3>
                <p className="text-xs text-white/40">Member since {new Date(profile.created_at).getFullYear()}</p>
            </div>

            <Separator className="bg-white/10 mb-4" />

            <div>
                <h4 className="text-sm font-medium text-white/50 mb-3 uppercase tracking-wider">Recently Read</h4>
                <ScrollArea className="h-40">
                    {history.length > 0 ? (
                        <div className="space-y-2">
                            {history.map(doc => (
                                <div key={doc.id} className="text-sm p-2 rounded hover:bg-white/5">
                                    <p className="text-white/90 truncate">{doc.title}</p>
                                    <p className="text-xs text-white/30">
                                        {doc.completed_at ? new Date(doc.completed_at).toLocaleDateString() : 'Recently'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-white/40 italic">No reading history shared.</p>
                    )}
                </ScrollArea>
            </div>
        </div>
    );
};
