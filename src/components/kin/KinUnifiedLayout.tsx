import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Users, X, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KinClubsView } from "./KinClubsView";
import { KinNetworkView } from "./KinNetworkView";

export const KinUnifiedLayout = ({ onViewProfile }: { onViewProfile?: (userId: string) => void }) => {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("network");
    const [createClubOpen, setCreateClubOpen] = useState(false);

    // Reset tab when closing
    useEffect(() => {
        if (!open) {
            setActiveTab("network");
        }
    }, [open]);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <button
                    className="absolute right-40 z-50 toolbar-button"
                    style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
                >
                    <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="sr-only">KiN</span>
                </button>
            </SheetTrigger>
            <SheetContent className="bg-card text-foreground w-full sm:max-w-4xl p-0 overflow-hidden flex flex-col items-stretch focus-visible:outline-none focus:outline-none">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full overflow-hidden">
                    {/* Header */}
                    <div className="pt-[calc(env(safe-area-inset-top)+2rem)] px-6 pb-4 flex flex-col gap-4 bg-background z-50">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-display font-medium tracking-wide uppercase shrink-0">
                                K<span className="lowercase font-sans text-xl relative -top-[1px]">i</span>N-Network
                            </h2>

                            <div className="flex items-center gap-2">
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

                        <TabsList className="w-full grid grid-cols-2">
                            <TabsTrigger value="network">KiNs</TabsTrigger>
                            <TabsTrigger value="clubs">KiN-Clubs</TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden relative bg-card">
                        <TabsContent value="network" className="h-full m-0 data-[state=active]:flex flex-col">
                            <KinNetworkView onViewProfile={(userId) => {
                                onViewProfile?.(userId);
                                setOpen(false);
                            }} />
                        </TabsContent>
                        <TabsContent value="clubs" className="h-full m-0 data-[state=active]:flex flex-col">
                            <KinClubsView
                                createModalOpen={createClubOpen}
                                setCreateModalOpen={setCreateClubOpen}
                            />
                        </TabsContent>
                    </div>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
};
