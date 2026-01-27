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
    onGenerateLink: () => Promise<string | null>;
}

export const ShareModal = ({ open, onOpenChange, onShare, onGenerateLink }: ShareModalProps) => {
    const [kins, setKins] = useState<any[]>([]);
    const { user } = useAuth();
    const { toast } = useToast();
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (!user || !open) return;
        setGeneratedLink(null); // Reset when reopening

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

    const handleGenerateLink = async () => {
        if (generatedLink) return generatedLink;
        setIsGenerating(true);
        try {
            const link = await onGenerateLink();
            if (link) setGeneratedLink(link);
            return link;
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyLink = async () => {
        const link = await handleGenerateLink();
        if (link) {
            navigator.clipboard.writeText(link);
            toast({ title: "Copied!", description: "Link copied to clipboard." });
        }
    };

    const handleShareWhatsApp = async () => {
        const link = await handleGenerateLink();
        if (link) {
            window.open(`https://wa.me/?text=${encodeURIComponent(link)}`, '_blank');
        }
    };

    const handleShareMessage = async () => {
        const link = await handleGenerateLink();
        if (link) {
            // "sms:&body=" works on mobile for iMessage/android messages
            window.location.href = `sms:&body=${encodeURIComponent(link)}`;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-display tracking-wide text-xl">Share TXT</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    {/* External Sharing */}
                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="secondary" className="w-full" onClick={handleCopyLink} disabled={isGenerating}>
                            {isGenerating ? "Creating..." : "Copy Link"}
                        </Button>
                        <Button variant="secondary" className="w-full" onClick={handleShareWhatsApp} disabled={isGenerating}>
                            WhatsApp
                        </Button>
                        <Button variant="secondary" className="w-full col-span-2" onClick={handleShareMessage} disabled={isGenerating}>
                            iMessage / SMS
                        </Button>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-zinc-950 px-2 text-muted-foreground">Or send to KiN</span>
                        </div>
                    </div>

                    {kins.length === 0 ? (
                        <p className="text-center text-white/40 text-sm">You don't have any connections yet.</p>
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
