import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { createClub } from "@/lib/clubDatabase";
import { toast } from "sonner";
import { Loader2, Users } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface CreateClubModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onClubCreated: () => void;
}

export const CreateClubModal = ({ open, onOpenChange, onClubCreated }: CreateClubModalProps) => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [kins, setKins] = useState<any[]>([]);
    const [selectedKinIds, setSelectedKinIds] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const { user } = useAuth();

    // Fetch KiNs when modal opens
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

    const toggleKin = (kinId: string) => {
        setSelectedKinIds(prev =>
            prev.includes(kinId)
                ? prev.filter(id => id !== kinId)
                : [...prev, kinId]
        );
    };

    const handleCreate = async () => {
        if (!name.trim()) {
            toast.error("Please enter a club name");
            return;
        }

        setIsCreating(true);
        console.log("Creating club:", { name, description, selectedKinIds });

        const { club, error } = await createClub(name.trim(), description.trim() || null, selectedKinIds);

        if (error) {
            console.error("Club creation error:", error);
            toast.error(`Failed to create club: ${error.message}`);
            setIsCreating(false);
            return;
        }

        console.log("Club created successfully:", club);
        toast.success(`Club "${name}" created successfully!`);
        setName("");
        setDescription("");
        setSelectedKinIds([]);
        setIsCreating(false);
        onClubCreated();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Create Reading Club</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 py-4">
                    <div className="space-y-2">
                        <label htmlFor="club-name" className="text-sm font-medium">
                            Club Name
                        </label>
                        <Input
                            id="club-name"
                            placeholder="e.g., Book Lovers Club"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={50}
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="club-description" className="text-sm font-medium">
                            Description (optional)
                        </label>
                        <Textarea
                            id="club-description"
                            placeholder="What's this club about?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={200}
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <label className="text-sm font-medium">
                                Invite KiNs (optional)
                            </label>
                        </div>

                        {kins.length === 0 ? (
                            <div className="p-4 rounded-lg bg-secondary/50 border border-border text-center text-muted-foreground text-sm">
                                No KiNs to invite yet. Add some friends first!
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
                                {kins.map(kin => (
                                    <div
                                        key={kin.id}
                                        className="flex items-center gap-3 p-2 rounded hover:bg-secondary/30 cursor-pointer"
                                        onClick={() => toggleKin(kin.id)}
                                    >
                                        <Checkbox
                                            checked={selectedKinIds.includes(kin.id)}
                                            onCheckedChange={() => toggleKin(kin.id)}
                                        />
                                        <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/5 flex items-center justify-center text-[10px] font-bold text-primary">
                                            {kin.avatar_url ? (
                                                <img src={kin.avatar_url} className="rounded-full w-full h-full object-cover" alt="" />
                                            ) : (
                                                getInitials(kin.display_name || kin.email || "?")
                                            )}
                                        </div>
                                        <span className="text-sm flex-1">{kin.display_name || kin.email}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {selectedKinIds.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                                {selectedKinIds.length} member{selectedKinIds.length !== 1 ? 's' : ''} selected
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isCreating}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={isCreating}>
                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Club
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
