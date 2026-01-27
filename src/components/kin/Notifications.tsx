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

export const Notifications = ({ onOpenDocument, onStartPongGame }: {
    onOpenDocument?: (id: string) => void;
    onStartPongGame?: (sessionId: string, opponentId: string, isHost: boolean) => void;
}) => {
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

    const handlePongAction = async (notification: Notification, action: 'accept' | 'decline' | 'ready') => {
        if (notification.type !== 'pong_challenge' && notification.type !== 'pong_accept') return;
        const payload = notification.payload as any;

        try {
            if (notification.type === 'pong_challenge') {
                if (action === 'accept') {
                    // Send pong_accept notification to challenger
                    await supabase.from('notifications').insert({
                        user_id: payload.challengerId,
                        type: 'pong_accept' as any,
                        payload: {
                            accepterId: user?.id,
                            sessionId: payload.sessionId
                        }
                    });
                    toast({ title: "Challenge Accepted!", description: "Click Ready when you're prepared to play." });
                } else if (action === 'decline') {
                    toast({ title: "Challenge Declined" });
                }
            } else if (notification.type === 'pong_accept' && action === 'ready') {
                // Challenger clicks Ready - notify the accepter to start the game
                await supabase.from('notifications').insert({
                    user_id: payload.accepterId,
                    type: 'pong_ready' as any,
                    payload: {
                        challengerId: user?.id,
                        sessionId: payload.sessionId
                    }
                });

                // Start the game for the challenger immediately
                onStartPongGame?.(payload.sessionId, payload.accepterId, true);

                toast({ title: "Ready!", description: "Starting game..." });
            }

            // Mark notification as read and remove
            await handleRead(notification.id);
            setNotifications(prev => prev.filter(n => n.id !== notification.id));

        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to process Pong action.", variant: "destructive" });
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="toolbar-button group relative">
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
                    {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-3.5 w-3.5 sm:h-4 sm:w-4 p-0 flex items-center justify-center bg-red-500 text-[8px] sm:text-[10px] text-white border-none">
                            {unreadCount}
                        </Badge>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-card border-border text-card-foreground">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No notifications yet
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`flex flex-col items-start p-3 border-b border-border last:border-0 ${!notification.is_read ? 'bg-secondary/30' : ''}`}
                            onClick={() => !notification.is_read && handleRead(notification.id)}
                        >
                            <div className="flex w-full justify-between items-start mb-1">
                                <span className="font-medium text-[10px] uppercase tracking-wider text-muted-foreground">
                                    {notification.type.replace('_', ' ')}
                                </span>
                                <span className="text-[10px] text-muted-foreground opacity-70">
                                    {new Date(notification.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-sm mb-2 text-foreground">
                                {notification.type === 'kin_request' && (
                                    <>
                                        <span className="font-bold text-foreground">{notification.senderProfile?.display_name || 'Someone'}</span> wants to connect.
                                    </>
                                )}
                                {notification.type === 'kin_accepted' && 'Your connection request was accepted.'}
                                {notification.type === 'shared_item' && (
                                    <>
                                        <span className="font-bold text-foreground">{notification.senderProfile?.display_name || 'Someone'}</span> wants to send you a TXT.
                                    </>
                                )}
                                {notification.type === 'pong_challenge' && (
                                    <>
                                        <span className="font-bold text-foreground">{notification.senderProfile?.display_name || 'Someone'}</span> challenged you to Pong!
                                    </>
                                )}
                                {notification.type === 'pong_accept' && (
                                    <>
                                        <span className="font-bold text-foreground">{notification.senderProfile?.display_name || 'Someone'}</span> accepted your challenge and is ready to play!
                                    </>
                                )}
                            </p>

                            {/* Actions for Request & Share */}
                            {(notification.type === 'kin_request' || notification.type === 'shared_item') && (
                                <div className="flex gap-2 w-full mt-1">
                                    <Button
                                        size="sm"
                                        className="h-7 bg-primary text-primary-foreground hover:bg-primary/90 flex-1"
                                        onClick={(e) => { e.stopPropagation(); handleAction(notification, 'accept'); }}
                                    >
                                        <Check className="w-3 h-3 mr-1" /> Accept
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 border-border text-foreground hover:bg-secondary flex-1"
                                        onClick={(e) => { e.stopPropagation(); handleAction(notification, 'decline'); }}
                                    >
                                        <X className="w-3 h-3 mr-1" /> Decline
                                    </Button>
                                </div>
                            )}

                            {/* Actions for Pong Challenge */}
                            {notification.type === 'pong_challenge' && (
                                <div className="flex gap-2 w-full mt-1">
                                    <Button
                                        size="sm"
                                        className="h-7 bg-primary text-primary-foreground hover:bg-primary/90 flex-1"
                                        onClick={(e) => { e.stopPropagation(); handlePongAction(notification, 'accept'); }}
                                    >
                                        <Check className="w-3 h-3 mr-1" /> Accept
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 border-border text-foreground hover:bg-secondary flex-1"
                                        onClick={(e) => { e.stopPropagation(); handlePongAction(notification, 'decline'); }}
                                    >
                                        <X className="w-3 h-3 mr-1" /> Decline
                                    </Button>
                                </div>
                            )}

                            {/* Ready button for Pong Accept */}
                            {notification.type === 'pong_accept' && (
                                <div className="flex gap-2 w-full mt-1">
                                    <Button
                                        size="sm"
                                        className="h-7 bg-green-600 text-white hover:bg-green-700 flex-1"
                                        onClick={(e) => { e.stopPropagation(); handlePongAction(notification, 'ready'); }}
                                    >
                                        Ready to Play!
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
