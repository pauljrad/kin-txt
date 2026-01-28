import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, Plus } from "lucide-react";
import { getClubMembers, getActiveBookSuggestion, getClubProgress } from "@/lib/clubDatabase";
import { getInitials } from "@/lib/utils";
import { SuggestBookModal } from "./SuggestBookModal";
import { toast } from "sonner";

interface ClubDetailsProps {
    club: any;
    onRefresh: () => void;
}

export const ClubDetails = ({ club, onRefresh }: ClubDetailsProps) => {
    const [members, setMembers] = useState<any[]>([]);
    const [activeSuggestion, setActiveSuggestion] = useState<any | null>(null);
    const [progress, setProgress] = useState<any[]>([]);
    const [suggestModalOpen, setSuggestModalOpen] = useState(false);

    useEffect(() => {
        loadClubData();
    }, [club.id]);

    const loadClubData = async () => {
        // Load members
        const { members: clubMembers, error } = await getClubMembers(club.id);
        if (error) {
            console.error("FAILED TO LOAD MEMBERS:", error);
            toast.error("Failed to load members. Check console for details.");
        } else {
            console.log("LOADED MEMBERS:", clubMembers);
        }
        setMembers(clubMembers.filter(m => m.status === 'accepted'));

        // Load active book suggestion
        const { suggestion } = await getActiveBookSuggestion(club.id);
        setActiveSuggestion(suggestion);

        // Load progress if there's an active suggestion
        if (suggestion) {
            const { progress: memberProgress } = await getClubProgress(club.id, suggestion.id);
            setProgress(memberProgress);
        }
    };

    const handleBookSuggested = () => {
        setSuggestModalOpen(false);
        loadClubData();
        toast.success("Book suggested to club members!");
    };

    return (
        <div className="space-y-6">
            {/* Club Header */}
            <div>
                <h3 className="text-2xl font-bold mb-2">{club.name}</h3>
                {club.description && (
                    <p className="text-muted-foreground">{club.description}</p>
                )}
            </div>

            {/* Members Section */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                        Members ({members.length})
                    </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                    {members.map(member => (
                        <div
                            key={member.id}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 border border-border/50"
                        >
                            <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/5 flex items-center justify-center text-[10px] font-bold text-primary">
                                {member.profiles?.avatar_url ? (
                                    <img
                                        src={member.profiles.avatar_url}
                                        className="rounded-full w-full h-full object-cover"
                                        alt={member.profiles.display_name}
                                    />
                                ) : (
                                    getInitials(member.profiles?.display_name || member.profiles?.email || "?")
                                )}
                            </div>
                            <span className="text-sm">{member.profiles?.display_name || member.profiles?.email}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Active Book Section */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                            Current Book
                        </h4>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => setSuggestModalOpen(true)}
                    >
                        <Plus className="h-4 w-4" />
                        Suggest Book
                    </Button>
                </div>

                {activeSuggestion ? (
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                            <h5 className="font-medium mb-1">{activeSuggestion.title}</h5>
                            <p className="text-xs text-muted-foreground">
                                Suggested by {activeSuggestion.profiles?.display_name}
                            </p>
                        </div>

                        {/* Progress Visualization */}
                        <div className="space-y-2">
                            <h5 className="text-sm font-medium">Reading Progress</h5>
                            {progress.map(p => (
                                <div key={p.id} className="flex items-center gap-3">
                                    <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/5 flex items-center justify-center text-[10px] font-bold text-primary">
                                        {p.profiles?.avatar_url ? (
                                            <img
                                                src={p.profiles.avatar_url}
                                                className="rounded-full w-full h-full object-cover"
                                                alt={p.profiles.display_name}
                                            />
                                        ) : (
                                            getInitials(p.profiles?.display_name || "?")
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>{p.profiles?.display_name}</span>
                                            <span className="text-muted-foreground">
                                                {p.status === 'accepted' ? `${Math.round(p.progress)}%` : p.status}
                                            </span>
                                        </div>
                                        {p.status === 'accepted' && (
                                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary transition-all"
                                                    style={{ width: `${p.progress}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="p-8 rounded-lg bg-secondary/50 border border-border text-center text-muted-foreground text-sm">
                        No book currently selected. Suggest a book to get started!
                    </div>
                )}
            </div>

            <SuggestBookModal
                open={suggestModalOpen}
                onOpenChange={setSuggestModalOpen}
                clubId={club.id}
                onBookSuggested={handleBookSuggested}
            />
        </div>
    );
};
