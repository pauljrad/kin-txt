import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ShareModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onShare: (userId: string) => void;
}

export const ShareModal = ({ open, onOpenChange, onShare }: ShareModalProps) => {
    const [kins, setKins] = useState<any[]>([]);
    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        if (!user || !open) return;

        const fetchKins = async () => {
            const { data: connections, error } = await supabase
                .from('kin_connections')
                .select(`
            requester_id,
            recipient_id,
            status
        `)
                .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
                .eq('status', 'accepted');

            if (error) {
                console.error("Error fetching kins:", error);
                return;
            }

            const friendIds = connections.map(c =>
                c.requester_id === user.id ? c.recipient_id : c.requester_id
            );

            if (friendIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('*')
                    .in('id', friendIds);
                setKins(profiles || []);
            } else {
                setKins([]);
            }
        };

        fetchKins();
    }, [user, open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-display tracking-wide text-xl">Send to K<span className="lowercase">i</span>N</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {kins.length === 0 ? (
                        <p className="text-center text-white/40">You don't have any connections yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {kins.map(kin => (
                                <div key={kin.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={kin.avatar_url || ''} />
                                            <AvatarFallback>{kin.display_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{kin.display_name}</span>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => {
                                            onShare(kin.id);
                                            onOpenChange(false);
                                        }}
                                    >
                                        <Send className="w-4 h-4 mr-2" />
                                        Send
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
