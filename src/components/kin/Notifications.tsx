import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

interface Notification {
    id: string;
    type: string;
    payload: any;
    is_read: boolean;
    created_at: string;
    senderProfile?: { display_name: string }; // Enriched data
}

export const Notifications = ({ onOpenDocument }: { onOpenDocument?: (id: string) => void }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const { user } = useAuth();
    const { toast } = useToast();

    const fetchNotifications = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(10);

        if (data) {
            const enriched = await Promise.all(data.map(async (n) => {
                const payload = n.payload as any;
                if (n.type === 'kin_request' && payload?.requester_id) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('display_name')
                        .eq('id', payload.requester_id)
                        .single();
                    return { ...n, senderProfile: profile };
                }
                if (n.type === 'pong_challenge' && payload?.challengerId) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('display_name')
                        .eq('id', payload.challengerId)
                        .single();
                    return { ...n, senderProfile: profile };
                }
                if (n.type === 'shared_item' && payload?.senderId) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('display_name')
                        .eq('id', payload.senderId)
                        .single();
                    return { ...n, senderProfile: profile };
                }
                return n;
            }));
            setNotifications(enriched as Notification[]);
        }
    };

    useEffect(() => {
        fetchNotifications();

        const channel = supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user?.id}`,
                },
                async (payload) => {
                    // Re-fetch to simpler handle enrichment logic
                    await fetchNotifications();
                    toast({
                        title: "New Notification",
                        description: "You have a new update in your KiN network.",
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, toast]);

    const handleRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    };

    const handleAction = async (notification: Notification, action: 'accept' | 'decline') => {
        if (notification.type !== 'kin_request' && notification.type !== 'shared_item') return;
        const payload = notification.payload as any;
        const requesterId = payload.requester_id || payload.senderId;

        try {
            if (notification.type === 'kin_request') {
                if (action === 'accept') {
                    const { error } = await supabase
                        .from('kin_connections')
                        .update({ status: 'accepted' })
                        .eq('requester_id', requesterId)
                        .eq('recipient_id', user?.id);
                    if (error) throw error;
                    toast({ title: "Connected!", description: "You are now KiNs." });
                } else {
                    const { error } = await supabase
                        .from('kin_connections')
                        .delete()
                        .eq('requester_id', requesterId)
                        .eq('recipient_id', user?.id);
                    if (error) throw error;
                    toast({ title: "Declined", description: "Request declined." });
                }
            } else if (notification.type === 'shared_item') {
                if (action === 'accept') {
                    // Fetch full content from shared_items
                    const { data: sharedItem, error: fetchErr } = await supabase
                        .from('shared_items')
                        .select('*')
                        .eq('sender_id', requesterId)
                        .eq('receiver_id', user?.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (fetchErr || !sharedItem) throw fetchErr || new Error("Shared item not found");

                    const content = sharedItem.content as any;

                    // Save to user's library
                    const { data: newDoc, error: saveErr } = await supabase
                        .from('documents')
                        .insert({
                            user_id: user?.id,
                            title: content.title || 'Shared TXT',
                            content: JSON.stringify(content.parsedText),
                            preview: content.preview || '',
                            word_count: content.parsedText.paragraphs.flat().length,
                            current_word_index: 0,
                            progress: 0,
                            source: 'paste',
                            file_type: null
                        })
                        .select()
                        .single();

                    if (saveErr) throw saveErr;

                    toast({ title: "TXT Added!", description: "Opening now..." });

                    // Mark as read in notifications and shared_items
                    await supabase.from('shared_items').update({ is_read: true }).eq('id', sharedItem.id);

                    if (newDoc) {
                        onOpenDocument?.(newDoc.id);
                    }
                } else {
                    // Decline: mark shared item read/handled
                    await supabase.from('shared_items').update({ is_read: true }).eq('sender_id', requesterId).eq('receiver_id', user?.id);
                    toast({ title: "Declined", description: "Shared item ignored." });
                }
            }


            // Mark notification as read and handled
            await handleRead(notification.id);
            // Remove from list immediately
            setNotifications(prev => prev.filter(n => n.id !== notification.id));


        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="group relative">
                    <Bell className="h-5 w-5 text-white/50 group-hover:text-white transition-colors" />
                    {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-red-500 text-[10px]">
                            {unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-zinc-950 border-white/10 text-white">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-white/40">
                        No notifications yet
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`flex flex-col items-start p-3 border-b border-white/5 last:border-0 ${!notification.is_read ? 'bg-white/5' : ''}`}
                            onClick={() => !notification.is_read && handleRead(notification.id)}
                        >
                            <div className="flex w-full justify-between items-start mb-1">
                                <span className="font-medium text-xs uppercase tracking-wider text-white/70">
                                    {notification.type.replace('_', ' ')}
                                </span>
                                <span className="text-[10px] text-white/30">
                                    {new Date(notification.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-sm mb-2">
                                {notification.type === 'kin_request' && (
                                    <>
                                        <span className="font-bold text-white">{notification.senderProfile?.display_name || 'Someone'}</span> wants to connect.
                                    </>
                                )}
                                {notification.type === 'kin_accepted' && 'Your connection request was accepted.'}
                                {notification.type === 'shared_item' && (
                                    <>
                                        <span className="font-bold text-white">{notification.senderProfile?.display_name || 'Someone'}</span> wants to send you a TXT.
                                    </>
                                )}
                                {notification.type === 'pong_challenge' && (
                                    <>
                                        <span className="font-bold text-white">{notification.senderProfile?.display_name || 'Someone'}</span> challenged you to Pong!
                                    </>
                                )}
                            </p>

                            {/* Actions for Request & Share */}
                            {(notification.type === 'kin_request' || notification.type === 'shared_item') && (
                                <div className="flex gap-2 w-full mt-1">
                                    <Button
                                        size="sm"
                                        className="h-7 bg-white text-black hover:bg-white/90 flex-1"
                                        onClick={(e) => { e.stopPropagation(); handleAction(notification, 'accept'); }}
                                    >
                                        <Check className="w-3 h-3 mr-1" /> Accept
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 border-white/20 text-white hover:bg-white/10 flex-1"
                                        onClick={(e) => { e.stopPropagation(); handleAction(notification, 'decline'); }}
                                    >
                                        <X className="w-3 h-3 mr-1" /> Decline
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
