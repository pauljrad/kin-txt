import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell } from "lucide-react";
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
}

export const Notifications = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        if (!user) return;

        // Fetch existing notifications
        const fetchNotifications = async () => {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (data) setNotifications(data);
        };

        fetchNotifications();

        // Subscribe to new notifications
        const channel = supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    setNotifications(prev => [payload.new as Notification, ...prev]);
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
                        <DropdownMenuItem
                            key={notification.id}
                            className={`flex flex-col items-start p-3 focus:bg-white/5 ${!notification.is_read ? 'bg-white/5' : ''}`}
                            onClick={() => handleRead(notification.id)}
                        >
                            <div className="flex w-full justify-between items-start mb-1">
                                <span className="font-medium text-xs uppercase tracking-wider text-white/70">
                                    {notification.type.replace('_', ' ')}
                                </span>
                                <span className="text-[10px] text-white/30">
                                    {new Date(notification.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-sm">
                                {notification.type === 'kin_request' && 'Someone wants to connect.'}
                                {notification.type === 'kin_accepted' && 'Your connection request was accepted.'}
                                {notification.type === 'shared_item' && 'Shared an item with you.'}
                                {notification.type === 'pong_challenge' && 'Challenged you to a game of Pong!'}
                            </p>
                        </DropdownMenuItem>
                    ))
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
