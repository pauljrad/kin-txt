import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { User } from "lucide-react";
import { useState } from "react";
import { MyProfile } from "./MyProfile";

export const KinProfileLayout = () => {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <button
                    className="absolute right-52 z-50 toolbar-button"
                    style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
                >
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="sr-only">KiN-Profile</span>
                </button>
            </SheetTrigger>
            <SheetContent className="bg-card text-foreground w-full sm:max-w-md p-0 overflow-hidden flex flex-col items-stretch [&>button]:top-[calc(env(safe-area-inset-top)+2.4rem)] [&>button]:right-6">
                {/* Header with Safe Area support */}
                <div className="pt-[calc(env(safe-area-inset-top)+2rem)] px-6 pb-6">
                    <h2 className="text-2xl font-display font-medium tracking-wide uppercase">
                        K<span className="lowercase font-sans text-xl relative -top-[1px]">i</span>N-Profile
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto text-foreground">
                    <MyProfile />
                </div>
            </SheetContent>
        </Sheet>
    );
};
