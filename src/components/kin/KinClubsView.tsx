import { useState, useEffect } from "react";
import { getUserClubs } from "@/lib/clubDatabase";
import { CreateClubModal } from "./CreateClubModal";
import { ClubDetails } from "./ClubDetails";
import { useAuth } from "@/hooks/useAuth";

interface KinClubsViewProps {
    createModalOpen: boolean;
    setCreateModalOpen: (open: boolean) => void;
}

export const KinClubsView = ({ createModalOpen, setCreateModalOpen }: KinClubsViewProps) => {
    const [clubs, setClubs] = useState<any[]>([]);
    const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
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
        if (!user) return;
        fetchClubs();
    }, [user]);

    const handleClubCreated = () => {
        setCreateModalOpen(false);
        fetchClubs();
    };

    const selectedClub = clubs.find(c => c.id === selectedClubId);

    return (
        <>
            <div className="flex-1 overflow-hidden flex relative h-full">
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

            <CreateClubModal
                open={createModalOpen}
                onOpenChange={setCreateModalOpen}
                onClubCreated={handleClubCreated}
            />
        </>
    );
};
