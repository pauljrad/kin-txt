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

// Reusing Book Cover style from EbookLibrary
const BookCover = ({ title, index }: { title: string; index: number }) => {
    const isDark = index % 2 === 0;
    const bgColor = isDark ? 'bg-[#000000]' : 'bg-[#ffffff]';
    const textColor = isDark ? 'text-white' : 'text-black';
    const logoColor = isDark ? 'bg-white' : 'bg-black';

    return (
        <div className={`aspect-[2/3] mb-2 rounded-md ${bgColor} flex flex-col items-center justify-between p-2 relative border border-border/10 shadow-inner group-hover:shadow-lg transition-all duration-500 overflow-hidden`}>
            {/* Centered KiN-TXT "i -" Logo */}
            <div className="flex-1 flex items-center justify-center">
                <div className="flex items-center gap-1.5">
                    <div className="relative flex flex-col items-center justify-center w-3 h-5">
                        <span className={`w-1 h-1 rounded-full ${logoColor} mb-0.5`} />
                        <span className={`w-1 h-2.5 ${logoColor} rounded-sm`} />
                    </div>
                    <div className={`w-2.5 h-0.5 ${logoColor} rounded-full opacity-80`} />
                </div>
            </div>

            {/* Title at the bottom */}
            <div className="w-full">
                <h4 className={`text-center font-display font-medium text-[8px] leading-tight uppercase tracking-widest ${textColor} line-clamp-3`}>
                    {title}
                </h4>
            </div>
        </div>
    );
};

export const SuggestBookModal = ({ open, onOpenChange, clubId, onBookSuggested }: SuggestBookModalProps) => {
    // ... existing state ...
    const [ebooks, setEbooks] = useState<any[]>([]);
    const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const { user } = useAuth();
    // ... existing useEffect ...

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

                // 3. Suggest the newly created document
                const { error: suggestError } = await suggestBook(clubId, (newDoc as any).id, (newDoc as any).title);
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

                <Tabs defaultValue="uploads" className="flex-1 flex flex-col overflow-hidden">
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
                        {/* ... existing uploads content ... */}
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
                        <div className="grid grid-cols-3 gap-4">
                            {AVAILABLE_EBOOKS.map((book, index) => (
                                <div
                                    key={book.id}
                                    className={`group relative cursor-pointer transition-all duration-300 p-2 rounded-lg ${selectedBookId === book.id
                                        ? 'ring-2 ring-primary/50 bg-primary/5'
                                        : 'hover:bg-secondary/50'
                                        }`}
                                    onClick={() => setSelectedBookId(book.id)}
                                >
                                    <BookCover title={book.title} index={index} />
                                    <h4 className="font-medium text-[10px] leading-tight text-center line-clamp-2 mt-1">{book.title}</h4>
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-3 pt-4 border-t px-6">
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
