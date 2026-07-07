import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getBlockedUserIds } from "@/lib/moderation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Search, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getInitials, getAvatarColor } from "@/lib/utils";

interface Profile {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    avatar_color: string | null;
    email: string | null;
}

export const UserSearch = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [results, setResults] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    const { toast } = useToast();

    // Clear results when search term is empty
    const clearResults = () => {
        setResults([]);
        setLoading(false);
    };

    const handleSearch = async (termOverride?: string) => {
        const term = termOverride !== undefined ? termOverride : searchTerm;
        if (!term.trim()) {
            clearResults();
            return;
        }
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .ilike('display_name', `%${term}%`)
                .neq('id', user?.id) // Don't show self
                .limit(10);

            if (error) throw error;
            const blocked = await getBlockedUserIds();
            setResults(((data as any) || []).filter((p: any) => !blocked.includes(p.id)));
        } catch (error) {
            console.error('Error searching users:', error);
            toast({
                title: "Error",
                description: "Could not search users. Please try again.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    // Auto-search effect with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm.trim().length >= 3) {
                handleSearch();
            } else if (searchTerm.trim().length === 0) {
                clearResults();
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const sendKinRequest = async (recipientId: string) => {
        if (!user) return;

        try {
            // Check if connection already exists
            const { data: existing, error: checkError } = await supabase
                .from('kin_connections')
                .select('*')
                .or(`and(requester_id.eq.${user.id},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${user.id})`)
                .single();

            if (existing) {
                toast({
                    title: "Connection exists",
                    description: "You are already connected or have a pending request with this user.",
                });
                return;
            }

            // Create connection request
            const { error } = await supabase
                .from('kin_connections')
                .insert({
                    requester_id: user.id,
                    recipient_id: recipientId,
                    status: 'pending'
                });

            if (error) throw error;

            // Create notification
            await supabase
                .from('notifications')
                .insert({
                    user_id: recipientId,
                    type: 'kin_request',
                    payload: { requester_id: user.id }
                });

            toast({
                title: "Request Sent",
                description: "Your KiN request has been sent.",
            });
        } catch (error) {
            console.error('Error sending request:', error);
            toast({
                title: "Error",
                description: "Could not send request. Please try again.",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Input
                    placeholder="Search by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
                />
                <Button onClick={() => handleSearch()} disabled={loading} variant="secondary" size="icon" className="shrink-0">
                    <Search className="h-4 w-4" />
                </Button>
            </div>

            <div className="space-y-2">
                {results.map((profile) => (
                    <div key={profile.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:bg-secondary/20 transition-colors">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border">
                                {profile.avatar_url ? (
                                    <AvatarImage src={profile.avatar_url} className="object-cover" />
                                ) : (
                                    <AvatarFallback
                                        className="text-xs font-bold"
                                        style={{ backgroundColor: getAvatarColor(profile.id, profile.avatar_color), color: '#000' }}
                                    >
                                        {getInitials(profile.display_name)}
                                    </AvatarFallback>
                                )}
                            </Avatar>
                            <div>
                                <p className="font-medium text-sm text-foreground">{profile.display_name || 'Anonymous'}</p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => sendKinRequest(profile.id)}
                        >
                            <UserPlus className="h-3.5 w-3.5 mr-2" />
                            Add KiN
                        </Button>
                    </div>
                ))}
                {results.length === 0 && searchTerm && !loading && (
                    <p className="text-center text-muted-foreground py-4 text-sm italic">No users found</p>
                )}
            </div>
        </div>
    );
};
