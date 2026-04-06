import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { getInitials, getAvatarColor } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Edit2, X, BookOpen, Users, Flame, Clock, Calendar, Bookmark } from "lucide-react";
import { useGamification } from "@/hooks/useGamification";

interface Profile {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    avatar_color: string | null;
    email: string | null;
    created_at: string;
}

const AVATAR_COLORS = [
    "#FFD600", // Kin Yellow
    "#F97316", // Orange
    "#0EA5E9", // Sky Blue
    "#D946EF", // Magenta
    "#10B981", // Emerald
    "#6366F1", // Indigo
    "#F43F5E", // Rose
    "#8B5CF6", // Violet
];

export const MyProfile = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [newDisplayName, setNewDisplayName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const [stats, setStats] = useState({ kinCount: 0, txtReadCount: 0 });
    const { status: subscriptionStatus, plan, stripeCustomerId } = useSubscription();
    const gamification = useGamification(user?.id);
    const [isRedirectingPortal, setIsRedirectingPortal] = useState(false);

    useEffect(() => {
        if (!user) return;

        const fetchProfile = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error("Error fetching profile:", error);
                return;
            }

            if (data) {
                setProfile(data as any);
                setNewDisplayName((data as any).display_name || "");
            }
        };

        const fetchStats = async () => {
            const { count: kinCount } = await supabase
                .from('kin_connections')
                .select('*', { count: 'exact', head: true })
                .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
                .eq('status', 'accepted');

            const { count: txtReadCount } = await supabase
                .from('documents')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_completed', true);

            setStats({
                kinCount: kinCount || 0,
                txtReadCount: txtReadCount || 0
            });
        };

        fetchProfile();
        fetchStats();
    }, [user]);

    const handleUpdateDisplayName = async () => {
        if (!user || !profile || !newDisplayName.trim()) return;
        setIsSaving(true);

        try {
            const { data, error } = await supabase
                .from('profiles')
                .update({ display_name: newDisplayName.trim() })
                .eq('id', user.id)
                .select()
                .single();

            if (error) throw error;
            if (data) {
                setProfile(data as any as Profile);
                setNewDisplayName((data as any).display_name || "");
            }
            setIsEditing(false);
            toast({
                title: "Profile Updated",
                description: "Your display name has been changed.",
            });
        } catch (error) {
            console.error("Error updating profile:", error);
            toast({
                title: "Update Failed",
                description: "Could not update display name. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateColor = async (color: string) => {
        if (!user || !profile) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ avatar_color: color } as any)
                .eq('id', user.id);

            if (error) throw error;

            setProfile({ ...profile, avatar_color: color } as any);
            toast({
                title: "Color Updated",
                description: "Your avatar color has been changed.",
            });
        } catch (error) {
            console.error("Error updating avatar color:", error);
            toast({
                title: "Update Failed",
                description: "Could not update color. Please try again.",
                variant: "destructive"
            });
        }
    };

    const handleManageSubscription = async () => {
        if (!stripeCustomerId) {
            toast({
                title: "Unavailable",
                description: "No billing portal associated with this account.",
                variant: "destructive"
            });
            return;
        }

        setIsRedirectingPortal(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-portal-session', {
                body: { customerId: stripeCustomerId },
            });

            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error("No URL returned");
            }
        } catch (error) {
            console.error("Error redirecting to portal:", error);
            toast({
                title: "Error",
                description: "Could not open subscription management portal.",
                variant: "destructive"
            });
            setIsRedirectingPortal(false);
        }
    };

    if (!profile) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Profile...</div>;

    return (
        <div className="flex flex-col p-6">
            <div className="flex flex-col items-center mb-8">
                {/* Clickable Avatar Area */}
                <div className="relative group cursor-pointer mb-4">
                    <Avatar className="h-24 w-24 border-2 border-border shadow-xl transition-transform hover:scale-105">
                        <AvatarImage src={profile.avatar_url || ''} className="object-cover" />
                        <AvatarFallback
                            className="text-2xl font-bold"
                            style={{ backgroundColor: getAvatarColor((profile as any).id, profile.avatar_color), color: '#000' }}
                        >
                            {getInitials(profile.display_name)}
                        </AvatarFallback>
                    </Avatar>
                </div>

                {isEditing ? (
                    <div className="flex flex-col items-center w-full max-w-[240px] gap-2 mb-4">
                        <div className="flex items-center gap-1 w-full justify-center">
                            <Input
                                value={newDisplayName}
                                onChange={(e) => setNewDisplayName(e.target.value)}
                                className="bg-secondary/50 border-border text-foreground font-display text-center uppercase tracking-tight h-10"
                                autoFocus
                            />
                            <div className="flex items-center">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-primary hover:bg-primary/10"
                                    onClick={handleUpdateDisplayName}
                                    disabled={isSaving}
                                >
                                    <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-muted-foreground hover:bg-secondary"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setNewDisplayName(profile.display_name || "");
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center gap-2 group w-full text-center mb-1">
                        <div className="relative flex items-center justify-center">
                            <h3 className="text-2xl font-display text-foreground uppercase tracking-tight text-center">
                                {profile.display_name || "Anonymous User"}
                            </h3>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="absolute -right-8 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                                onClick={() => setIsEditing(true)}
                            >
                                <Edit2 className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                )}

                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] mb-6">
                    K<span className="lowercase font-sans text-[10px] relative -top-[0.5px]">i</span>N since {new Date(profile.created_at).getFullYear()}
                </p>

                {/* Integrated Color Picker - Right at the top below name */}
                <div className="w-full max-w-[280px]">
                    <div className="flex justify-center gap-2 p-2 rounded-2xl bg-secondary/5 border border-border/20 shadow-inner">
                        {AVATAR_COLORS.map((color) => (
                            <button
                                key={color}
                                onClick={() => handleUpdateColor(color)}
                                className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-125 active:scale-95 ${profile.avatar_color === color ? "border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.3)]" : "border-transparent"
                                    }`}
                                style={{ backgroundColor: color }}
                                title={color}
                            />
                        ))}
                    </div>
                    <p className="text-[8px] text-muted-foreground text-center mt-2 uppercase tracking-widest opacity-60">Tap a color to change your profile theme</p>
                </div>
            </div>

            <Separator className="mb-6 opacity-30" />

            <div className="space-y-6">
                {/* Stats Section */}
                {/* Gamification Stats Section */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-4 rounded-xl bg-secondary/10 border border-border/20 flex flex-col items-center justify-center text-center">
                        <Flame className="h-5 w-5 text-orange-500 mb-1.5 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                        <span className="text-2xl font-display text-foreground">{gamification.currentStreak}</span>
                        <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Day Streak</span>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/10 border border-border/20 flex flex-col items-center justify-center text-center">
                        <Clock className="h-5 w-5 text-primary mb-1.5 opacity-80" />
                        <span className="text-2xl font-display text-foreground">{Math.floor(gamification.totalReadingTimeSeconds / 60)}</span>
                        <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Total Mins</span>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/10 border border-border/20 flex flex-col items-center justify-center text-center">
                        <BookOpen className="h-5 w-5 text-primary mb-1.5 opacity-80" />
                        <span className="text-2xl font-display text-foreground">{gamification.booksRead}</span>
                        <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Books Read</span>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/10 border border-border/20 flex flex-col items-center justify-center text-center">
                        <Bookmark className="h-5 w-5 text-primary mb-1.5 opacity-80" />
                        <span className="text-2xl font-display text-foreground">{gamification.articlesRead}</span>
                        <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Articles</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-secondary/20 border border-border/40 flex flex-col items-center justify-center text-center">
                        <Users className="h-4 w-4 text-primary mb-1.5 opacity-70" />
                        <span className="text-2xl font-display text-foreground">{stats.kinCount}</span>
                        <span className="text-[10px] text-muted-foreground tracking-wider font-bold">K<span className="lowercase font-sans text-[10px] relative -top-[0.5px]">i</span>N<span className="lowercase font-sans">s</span></span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <h4 className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-[0.2em]">Email Address</h4>
                        <p className="text-sm text-muted-foreground font-medium p-3 rounded-xl bg-secondary/10 border border-border/20 select-all">
                            {profile.email}
                        </p>
                    </div>

                    <div>
                        <h4 className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-[0.2em]">Member Details</h4>
                        <div className="p-3 rounded-xl bg-secondary/10 border border-border/20 text-xs space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Joined</span>
                                <span className="text-foreground font-medium">{new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-[0.2em]">Subscription & Billing</h4>
                        <div className="p-3 rounded-xl bg-secondary/10 border border-border/20 text-xs space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Status</span>
                                <span className="text-foreground font-medium capitalize">
                                    {subscriptionStatus === 'none' ? 'No Active Plan' : subscriptionStatus === 'trialing' ? 'Free Trial' : subscriptionStatus}
                                </span>
                            </div>
                            
                            {plan && subscriptionStatus !== 'lifetime' && (
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Plan Tier</span>
                                    <span className="text-foreground font-medium capitalize">{plan}</span>
                                </div>
                            )}

                            {stripeCustomerId && subscriptionStatus !== 'lifetime' && subscriptionStatus !== 'none' && (
                                <div className="pt-2 border-t border-border/20 mt-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="w-full text-xs h-8 border-border hover:bg-secondary/50 font-display tracking-widest uppercase transition-colors"
                                        onClick={handleManageSubscription}
                                        disabled={isRedirectingPortal}
                                    >
                                        {isRedirectingPortal ? 'Redirecting...' : 'Manage Subscription'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
