import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { suggestBook } from "@/lib/clubDatabase";
import { toast } from "sonner";
import { Loader2, BookOpen } from "lucide-react";

interface SuggestBookModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clubId: string;
    onBookSuggested: () => void;
}

export const SuggestBookModal = ({ open, onOpenChange, clubId, onBookSuggested }: SuggestBookModalProps) => {
    const [ebooks, setEbooks] = useState<any[]>([]);
    const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        if (!user || !open) return;

        const fetchEbooks = async () => {
            const { data, error } = await supabase
                .from('documents' as any)
                .select('*')
                .eq('user_id', user.id)
                .eq('source', 'ebook')
                .order('created_at', { ascending: false });

            if (!error && data) {
                setEbooks(data);
            }
        };

        fetchEbooks();
    }, [user, open]);

    const handleSuggest = async () => {
        if (!selectedBookId) {
            toast.error("Please select a book");
            return;
        }

        const selectedBook = ebooks.find(b => b.id === selectedBookId);
        if (!selectedBook) return;

        setIsSuggesting(true);
        const { suggestion, error } = await suggestBook(clubId, selectedBookId, selectedBook.title);

        if (error) {
            toast.error("Failed to suggest book");
            setIsSuggesting(false);
            return;
        }

        setSelectedBookId(null);
        setIsSuggesting(false);
        onBookSuggested();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Suggest a Book</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4">
                    {ebooks.length === 0 ? (
                        <div className="p-8 rounded-lg bg-secondary/50 border border-border text-center text-muted-foreground text-sm">
                            You don't have any ebooks in your library yet. Upload one first!
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {ebooks.map(book => (
                                <div
                                    key={book.id}
                                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedBookId === book.id
                                            ? 'bg-primary/10 border-primary'
                                            : 'bg-secondary/30 border-border/50 hover:bg-secondary/60 hover:border-border'
                                        }`}
                                    onClick={() => setSelectedBookId(book.id)}
                                >
                                    <div className="flex items-start gap-3">
                                        <BookOpen className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-sm">{book.title}</h4>
                                            {book.preview && (
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                    {book.preview}
                                                </p>
                                            )}
                                            <div className="text-xs text-muted-foreground mt-2">
                                                {book.word_count?.toLocaleString()} words
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSuggesting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSuggest}
                        disabled={!selectedBookId || isSuggesting}
                    >
                        {isSuggesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Suggest to Club
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
