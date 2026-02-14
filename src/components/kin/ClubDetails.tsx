import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, Users, LogOut } from "lucide-react";
import { getClubMembers, getActiveBookSuggestion, getClubProgress, leaveClub, respondToBookSuggestion } from "@/lib/clubDatabase";
import { getInitials, getAvatarColor } from "@/lib/utils";
import { SuggestBookModal } from "./SuggestBookModal";
import { supabase } from "@/integrations/supabase/client";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface ClubDetailsProps {
    club: any;
    onRefresh: () => void;
    onBack?: () => void;
}

export const ClubDetails = ({ club, onRefresh, onBack }: ClubDetailsProps) => {
    const [members, setMembers] = useState<any[]>([]);
    const [activeSuggestion, setActiveSuggestion] = useState<any | null>(null);
    const [progress, setProgress] = useState<any[]>([]);
    const [userProgress, setUserProgress] = useState<any | null>(null);
    const [suggestModalOpen, setSuggestModalOpen] = useState(false);
    const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

    const fetchProgress = async (suggestionId: string) => {
        try {
            console.log("[ClubDetails] Fetching progress for suggestion:", suggestionId);
            const { progress: progressData, error } = await getClubProgress(club.id, suggestionId);
            if (error) throw error;

            setProgress(progressData);

            // Also update local user progress status
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const myProg = progressData.find((p: any) => p.user_id === user.id);
                console.log("[ClubDetails] Found my progress:", myProg);
                setUserProgress(myProg || null);
            }
        } catch (err) {
            console.error("[ClubDetails] Error fetching progress:", err);
        }
    };

    const loadClubData = async () => {
        try {
            console.log("[ClubDetails] Loading club data for:", club.id);
            // Load members
            const { members: clubMembers, error: memberError } = await getClubMembers(club.id);
            if (memberError) throw memberError;

            setMembers(clubMembers.filter(m => m.status === 'accepted'));

            // Load active book suggestion
            const { suggestion, error: suggestionError } = await getActiveBookSuggestion(club.id);
            if (suggestionError) throw suggestionError;

            console.log("[ClubDetails] Active suggestion:", suggestion);
            setActiveSuggestion(suggestion);

            // Load progress if there's an active suggestion
            if (suggestion) {
                await fetchProgress(suggestion.id);
            } else {
                setProgress([]);
                setUserProgress(null);
            }
        } catch (error) {
            console.error("[ClubDetails] Error loading club data:", error);
            toast.error("Failed to load club dashboard");
        }
    };

    // Initial load
    useEffect(() => {
        loadClubData();
    }, [club.id]);

    useEffect(() => {
        if (!activeSuggestion) return;

        console.log("SETTING UP REAL-TIME PROGRESS SYNC FOR:", activeSuggestion.id);

        // Fetch initial progress
        fetchProgress(activeSuggestion.id);

        // Subscribe to changes
        const channel = supabase
            .channel(`club_progress_${activeSuggestion.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'club_member_progress',
                    filter: `suggestion_id=eq.${activeSuggestion.id}`
                },
                (payload) => {
                    console.log("REAL-TIME PROGRESS UPDATE RECEIVED:", payload);
                    fetchProgress(activeSuggestion.id);
                }
            )
            .subscribe();

        return () => {
            console.log("CLEANING UP PROGRESS SYNC");
            supabase.removeChannel(channel);
        };
    }, [activeSuggestion?.id]);

    const handleBookSuggested = () => {
        setSuggestModalOpen(false);
        loadClubData();
        onRefresh(); // Refresh club list in parent if needed
        toast.success("Book suggested to club members!");

        // Dispatch event for Index library refresh
        window.dispatchEvent(new CustomEvent('kin_library_refreshed'));
    };

    const handleLeaveClub = async () => {
        const { success, error } = await leaveClub(club.id);
        if (error) {
            toast.error("Failed to leave club");
            return;
        }
        toast.success("Left club successfully");
        setLeaveDialogOpen(false);
        onRefresh();
        if (onBack) onBack();
    };

    const handleRespondToSuggestion = async (accept: boolean) => {
        if (!activeSuggestion) return;
        const { success, error } = await respondToBookSuggestion(activeSuggestion.id, accept);
        if (error) {
            toast.error(`Failed to ${accept ? 'accept' : 'decline'} book suggestion`);
            return;
        }
        toast.success(accept ? "Book accepted!" : "Book declined");
        loadClubData();
    };

    // Add missing import via replace if needed or assume it's there? 
    // The previous replace added imports but in the wrong place? No, I commented them.
    // I need to add import { useNavigate } from "react-router-dom" at the top of the file properly if not present.
    // But I can use window.location.href as I did before, avoiding the import dependency specific to react-router version quirks if lazy.
    // However, the cleanest way is correctly placing `handleReadBook`.

    const handleReadBook = () => {
        if (userProgress?.document_id) {
            window.location.href = `/home?read=${userProgress.document_id}`;
        } else if (userProgress?.status === 'invited') {
            toast("Please accept the book first to start reading.");
        } else {
            toast("You don't have this book in your library yet.");
        }
    };

    return (
        <div className="space-y-6">
            {/* Mobile Back Button */}
            {onBack && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden -ml-2 mb-2 gap-1 text-muted-foreground hover:text-foreground"
                    onClick={onBack}
                >
                    <Users className="h-4 w-4 rotate-180" /> {/* Using generic back icon or rotate arrow */}
                    Back to Clubs
                </Button>
            )}

            {/* Club Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-2xl font-bold mb-2">{club.name}</h3>
                    {club.description && (
                        <p className="text-muted-foreground">{club.description}</p>
                    )}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-destructive hover:text-destructive"
                    onClick={() => setLeaveDialogOpen(true)}
                >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Leave Club</span>
                </Button>
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
                            <div
                                className="h-6 w-6 rounded-full border border-primary/5 flex items-center justify-center text-[10px] font-bold"
                                style={{ backgroundColor: getAvatarColor(member.user_id, member.profiles?.avatar_color), color: '#000' }}
                            >
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
                    {/* Only show suggest button if no active suggestion */}
                    {!activeSuggestion && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => setSuggestModalOpen(true)}
                        >
                            <Plus className="h-4 w-4" />
                            Suggest Book
                        </Button>
                    )}
                </div>

                {activeSuggestion ? (
                    <div className="space-y-4">
                        <div
                            onClick={handleReadBook}
                            className={`p-4 rounded-lg bg-secondary/30 border border-border group transition-all ${userProgress?.document_id ? 'cursor-pointer hover:bg-secondary/50 hover:border-primary/50' : ''}`}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h5 className="font-medium mb-1 group-hover:text-primary transition-colors flex items-center gap-2">
                                        {activeSuggestion.title}
                                        {userProgress?.document_id && <BookOpen className="w-3 h-3 opacity-50" />}
                                    </h5>
                                    <p className="text-xs text-muted-foreground">
                                        Suggested by {activeSuggestion.profiles?.display_name}
                                    </p>
                                </div>
                                {userProgress?.document_id && (
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-primary border border-primary/20 px-1.5 py-0.5 rounded bg-primary/5">
                                        Reading
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Show accept/decline buttons if user hasn't responded */}
                        {userProgress && userProgress.status === 'invited' && (
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleRespondToSuggestion(true)}
                                    className="flex-1"
                                >
                                    Accept Book
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRespondToSuggestion(false)}
                                    className="flex-1"
                                >
                                    Decline
                                </Button>
                            </div>
                        )}

                        {/* Progress Visualization */}
                        <div className="space-y-2">
                            <h5 className="text-sm font-medium">Reading Progress</h5>
                            {progress.map(p => (
                                <div key={p.id} className="flex items-center gap-3">
                                    <div
                                        className="h-6 w-6 rounded-full border border-primary/5 flex items-center justify-center text-[10px] font-bold"
                                        style={{ backgroundColor: getAvatarColor(p.user_id, p.profiles?.avatar_color), color: '#000' }}
                                    >
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
                                                {p.status === 'invited' ? 'Invited' : `${Math.round(p.progress || 0)}%`}
                                            </span>
                                        </div>
                                        {p.status !== 'invited' && (
                                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className="h-full transition-all"
                                                    style={{
                                                        width: `${p.progress || 0}%`,
                                                        backgroundColor: getAvatarColor(p.user_id, p.profiles?.avatar_color)
                                                    }}
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

            <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Leave Club?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to leave "{club.name}"?
                            {members.length === 1 && " Since you're the last member, this club will be permanently deleted."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLeaveClub} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Leave Club
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
