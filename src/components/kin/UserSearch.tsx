import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Search, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Profile {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    email: string | null;
}

export const UserSearch = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [results, setResults] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    const { toast } = useToast();

    const handleSearch = async () => {
        if (!searchTerm.trim()) return;
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .ilike('display_name', `%${searchTerm}%`)
                .neq('id', user?.id) // Don't show self
                .limit(10);

            if (error) throw error;
            setResults(data || []);
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
        <div className="space-y-4 p-4">
            <div className="flex gap-2">
                <Input
                    placeholder="Search for KiNs by display name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="bg-black/20 border-white/10 text-white placeholder:text-white/40"
                />
                <Button onClick={handleSearch} disabled={loading} variant="secondary">
                    <Search className="h-4 w-4" />
                </Button>
            </div>

            <div className="space-y-2">
                {results.map((profile) => (
                    <div key={profile.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={profile.avatar_url || ''} />
                                <AvatarFallback>{profile.display_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium text-white">{profile.display_name || 'Anonymous'}</p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="hover:bg-white/10"
                            onClick={() => sendKinRequest(profile.id)}
                        >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add KiN
                        </Button>
                    </div>
                ))}
                {results.length === 0 && searchTerm && !loading && (
                    <p className="text-center text-white/40 py-4">No users found</p>
                )}
            </div>
        </div>
    );
};
