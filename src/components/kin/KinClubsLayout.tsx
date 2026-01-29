import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { BookMarked, Plus, X } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getUserClubs, getClubMembers, getActiveBookSuggestion, getClubProgress } from "@/lib/clubDatabase";
import { getInitials } from "@/lib/utils";
import { CreateClubModal } from "./CreateClubModal";
import { ClubDetails } from "./ClubDetails";

export const KinClubsLayout = () => {
    const [open, setOpen] = useState(false);
    const [clubs, setClubs] = useState<any[]>([]);
    const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const { user } = useAuth();

    const fetchClubs = async () => {
        if (!user) return;
        const { clubs: userClubs, error } = await getUserClubs();
        if (!error) {
            const acceptedClubs = userClubs.filter(c => c.membership_status === 'accepted');
            setClubs(acceptedClubs);
        }
    };

    useEffect(() => {
        if (!user || !open) return;
        fetchClubs();
    }, [user, open]);

    const handleClubCreated = () => {
        setCreateModalOpen(false);
        fetchClubs();
    };

    const selectedClub = clubs.find(c => c.id === selectedClubId);

    return (
        <>
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <button
                        className="fixed right-64 z-50 toolbar-button"
                        style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
                    >
                        <BookMarked className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="sr-only">KiN-Clubs</span>
                    </button>
                </SheetTrigger>
                <SheetContent className="bg-card border-l border-border text-foreground w-full sm:max-w-4xl p-0 overflow-hidden flex flex-col items-stretch focus-visible:outline-none focus:outline-none">
                    {/* Header */}
                    <div className="pt-[calc(env(safe-area-inset-top)+2rem)] px-6 pb-6 border-b border-border flex justify-between items-center gap-4">
                        <h2 className="text-2xl font-bold font-display tracking-wide uppercase shrink-0">
                            K<span className="lowercase font-sans text-xl relative -top-[1px]">i</span>N-Clubs
                        </h2>

                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => setCreateModalOpen(true)}
                                size="sm"
                                className="gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                <span className="hidden sm:inline">Create Club</span>
                                <span className="sm:hidden">Create</span>
                            </Button>

                            <Button
                                onClick={() => setOpen(false)}
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 -mr-2"
                            >
                                <X className="h-5 w-5" />
                                <span className="sr-only">Close</span>
                            </Button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden flex relative">
                        {/* Clubs List Sidebar */}
                        <div
                            className={`
                                w-full md:w-72 border-r border-border overflow-y-auto p-4 absolute inset-0 md:static bg-card transition-transform duration-300 z-10
                                ${selectedClubId ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
                            `}
                        >
                            <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                                My Clubs
                            </h3>
                            {clubs.length === 0 ? (
                                <div className="p-4 rounded-lg bg-secondary/50 border border-border text-center text-muted-foreground text-sm italic">
                                    No clubs yet. Create one to get started!
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {clubs.map(club => (
                                        <div
                                            key={club.id}
                                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedClubId === club.id
                                                ? 'bg-primary/10 border-primary/50'
                                                : 'bg-secondary/30 border-border/50 hover:bg-secondary/60 hover:border-border'
                                                }`}
                                            onClick={() => setSelectedClubId(club.id)}
                                        >
                                            <div className="font-medium text-sm">{club.name}</div>
                                            {club.description && (
                                                <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                                    {club.description}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Club Details Panel */}
                        <div
                            className={`
                                flex-1 overflow-y-auto p-6 absolute inset-0 md:static bg-card transition-transform duration-300 z-20
                                ${selectedClubId ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                            `}
                        >
                            {selectedClub ? (
                                <ClubDetails
                                    club={selectedClub}
                                    onRefresh={fetchClubs}
                                    onBack={() => setSelectedClubId(null)}
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground hidden md:flex">
                                    Select a club to view details
                                </div>
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            <CreateClubModal
                open={createModalOpen}
                onOpenChange={setCreateModalOpen}
                onClubCreated={handleClubCreated}
            />
        </>
    );
};
