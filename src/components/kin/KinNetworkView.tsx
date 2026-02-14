import { UserSearch } from "./UserSearch";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getInitials, getAvatarColor } from "@/lib/utils";

interface KinNetworkViewProps {
    onViewProfile?: (userId: string) => void;
}

export const KinNetworkView = ({ onViewProfile }: KinNetworkViewProps) => {
    const [kins, setKins] = useState<any[]>([]);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

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
    }, [user]);

    return (
        <div className="flex-1 overflow-y-auto p-6 text-foreground h-full">
            <div className="space-y-6 max-w-2xl">
                <section>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Find K<span className="lowercase font-sans text-xs relative -top-[0.5px]">i</span>Ns</h3>
                    <UserSearch />
                </section>

                <section>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">My K<span className="lowercase font-sans text-xs relative -top-[0.5px]">i</span>Ns</h3>
                    {kins.length === 0 ? (
                        <div className="p-4 rounded-lg bg-secondary/50 border border-border text-center text-muted-foreground text-sm italic">
                            You haven't connected with anyone yet.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {kins.map(kin => (
                                <div key={kin.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50 hover:bg-secondary/60 hover:border-border cursor-pointer transition-colors"
                                    onClick={() => {
                                        onViewProfile?.(kin.id);
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="h-8 w-8 rounded-full border border-primary/5 flex items-center justify-center text-[10px] font-bold"
                                            style={{ backgroundColor: getAvatarColor(kin.id, kin.avatar_color), color: '#000' }}
                                        >
                                            {kin.avatar_url ? (
                                                <img src={kin.avatar_url} className="rounded-full w-full h-full object-cover" />
                                            ) : (
                                                getInitials(kin.display_name)
                                            )}
                                        </div>
                                        <span className="font-medium text-sm">{kin.display_name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};
