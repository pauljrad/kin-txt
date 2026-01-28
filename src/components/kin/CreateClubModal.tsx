import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { UserSearch } from "./UserSearch";
import { createClub } from "@/lib/clubDatabase";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateClubModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onClubCreated: () => void;
}

export const CreateClubModal = ({ open, onOpenChange, onClubCreated }: CreateClubModalProps) => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) {
            toast.error("Please enter a club name");
            return;
        }

        setIsCreating(true);
        const { club, error } = await createClub(name.trim(), description.trim() || null, selectedMemberIds);

        if (error) {
            toast.error("Failed to create club");
            setIsCreating(false);
            return;
        }

        toast.success(`Club "${name}" created successfully!`);
        setName("");
        setDescription("");
        setSelectedMemberIds([]);
        setIsCreating(false);
        onClubCreated();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Reading Club</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
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
                        <label className="text-sm font-medium">
                            Invite Members (optional)
                        </label>
                        <UserSearch
                            onUserSelect={(userId) => {
                                if (!selectedMemberIds.includes(userId)) {
                                    setSelectedMemberIds([...selectedMemberIds, userId]);
                                }
                            }}
                        />
                        {selectedMemberIds.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                                {selectedMemberIds.length} member{selectedMemberIds.length !== 1 ? 's' : ''} selected
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3">
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
