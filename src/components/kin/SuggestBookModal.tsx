import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { suggestBook } from "@/lib/clubDatabase";
import { toast } from "sonner";
import { Loader2, BookOpen, Library, Upload } from "lucide-react";
import { AVAILABLE_EBOOKS, Ebook } from "../EbookLibrary";
import { parseFile } from "@/lib/textParser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

        const selectedEbook = AVAILABLE_EBOOKS.find(b => b.id === selectedBookId);

        // Handle Ebook Library Suggestion
        if (selectedEbook) {
            setIsSuggesting(true);
            try {
                // 1. Load and parse the file
                const response = await fetch(selectedEbook.filePath);
                if (!response.ok) throw new Error('Failed to load ebook');
                const blob = await response.blob();
                const file = new File([blob], `${selectedEbook.title}.epub`, { type: 'application/epub+zip' });
                const parsed = await parseFile(file);

                // 2. Save to my documents first
                // Note: parseFile returns { paragraphs }, not cleanedText directly. 
                // We use paragraphs as the text content.
                const content = {
                    title: selectedEbook.title,
                    parsedText: { paragraphs: parsed.paragraphs },
                    preview: parsed.paragraphs[0]?.[0]?.slice(0, 100) + '...',
                    progress: 0,
                    fileType: 'epub'
                };

                const { data: newDoc, error: saveError } = await supabase
                    .from('documents' as any)
                    .insert({
                        user_id: user?.id,
                        title: content.title,
                        content: JSON.stringify(content.parsedText),
                        preview: content.preview,
                        word_count: content.parsedText.paragraphs.flat().length || 0,
                        source: 'ebook',
                        file_type: 'epub',
                        current_word_index: 0,
                        progress: 0
                    })
                    .select()
                    .single();

                if (saveError) throw saveError;

                // Assert newDoc to any to avoid strict type error if types aren't perfectly aligned
                const doc = newDoc as any;

                // 3. Suggest the newly created document
                const { error: suggestError } = await suggestBook(clubId, doc.id, doc.title);
                if (suggestError) throw suggestError;

                toast.success("Book imported and suggested!");
                setSelectedBookId(null);
                onBookSuggested();
            } catch (error) {
                console.error("Library suggest error:", error);
                toast.error("Failed to suggest book from library");
            } finally {
                setIsSuggesting(false);
            }
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

                <div className="flex-1 overflow-hidden">
                    <Tabs defaultValue="uploads" className="flex flex-col h-full">
                        <div className="px-6">
                            <TabsList className="w-full grid grid-cols-2">
                                <TabsTrigger value="uploads" className="gap-2">
                                    <Upload className="w-4 h-4" /> My Uploads
                                </TabsTrigger>
                                <TabsTrigger value="library" className="gap-2">
                                    <Library className="w-4 h-4" /> KiN-TXT Library
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="uploads" className="flex-1 overflow-y-auto py-4 px-6 mt-0">
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
                        </TabsContent>

                        <TabsContent value="library" className="flex-1 overflow-y-auto py-4 px-6 mt-0">
                            <div className="grid grid-cols-2 gap-3">
                                {AVAILABLE_EBOOKS.map(book => (
                                    <div
                                        key={book.id}
                                        className={`p-3 rounded-lg border cursor-pointer transition-colors relative flex flex-col ${selectedBookId === book.id
                                            ? 'bg-primary/10 border-primary'
                                            : 'bg-secondary/30 border-border/50 hover:bg-secondary/60 hover:border-border'
                                            }`}
                                        onClick={() => setSelectedBookId(book.id)}
                                    >
                                        <div className="aspect-[2/3] bg-background border border-border/20 rounded-md mb-3 flex flex-col items-center justify-center p-2 text-center overflow-hidden">
                                            <span className="text-[10px] uppercase font-bold tracking-wider leading-tight">
                                                {book.title}
                                            </span>
                                        </div>
                                        <h4 className="font-medium text-xs leading-tight mb-1">{book.title}</h4>
                                        <p className="text-[10px] text-muted-foreground">{book.author}</p>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>
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
