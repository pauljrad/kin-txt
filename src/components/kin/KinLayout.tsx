import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { UserSearch } from "./UserSearch";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";

export const KinLayout = ({ onViewProfile }: { onViewProfile?: (userId: string) => void }) => {
    const [open, setOpen] = useState(false);
    const [kins, setKins] = useState<any[]>([]);
    const { user } = useAuth();

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
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-16 z-50 text-white/50 hover:text-white hover:bg-white/10"
                >
                    <Users className="h-5 w-5" />
                    <span className="sr-only">KiN Network</span>
                </Button>
            </SheetTrigger>
            <SheetContent className="bg-zinc-950 border-white/10 text-white w-full sm:max-w-md p-0 overflow-y-auto">
                <div className="p-6">
                    <h2 className="text-2xl font-bold mb-6 font-display">KiN Network</h2>

                    <div className="space-y-6">
                        <section>
                            <h3 className="text-sm font-medium text-white/50 mb-3 uppercase tracking-wider">Find KiNs</h3>
                            <UserSearch />
                        </section>

                        <section>
                            <h3 className="text-sm font-medium text-white/50 mb-3 uppercase tracking-wider">My KiNs</h3>
                            {kins.length === 0 ? (
                                <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center text-white/40 text-sm">
                                    You haven't connected with anyone yet.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {kins.map(kin => (
                                        <div key={kin.id}
                                            className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors"
                                            onClick={() => {
                                                onViewProfile?.(kin.id);
                                                setOpen(false);
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs">
                                                    {kin.avatar_url ? <img src={kin.avatar_url} className="rounded-full" /> : kin.display_name?.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="font-medium">{kin.display_name}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};
