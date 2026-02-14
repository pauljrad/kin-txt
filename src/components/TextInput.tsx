import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Type, X, Link as LinkIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { parseFile, parseTextContent, ParsedText } from '@/lib/textParser';
import { supabase } from '@/integrations/supabase/client';

interface TextInputProps {
  onTextParsed: (parsed: ParsedText, title: string, source: 'paste' | 'file' | 'url') => void;
}

type InputMode = 'paste' | 'upload' | 'url' | null;

export function TextInput({ onTextParsed }: TextInputProps) {
  const [mode, setMode] = useState<InputMode>(null);
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleMode = (newMode: 'paste' | 'upload' | 'url') => {
    setMode(prev => prev === newMode ? null : newMode);
    setError(null);
  };

  const handleTextSubmit = useCallback(() => {
    if (!text.trim()) return;
    const parsed = parseTextContent(text);
    const title = text.slice(0, 50).split('\n')[0] || 'Pasted Text';
    onTextParsed(parsed, title, 'paste');
  }, [text, onTextParsed]);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      const parsed = await parseFile(file);
      onTextParsed(parsed, file.name, 'file');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
      setFileName(null);
    } finally {
      setIsLoading(false);
    }
  }, [onTextParsed]);

  const handleUrlSubmit = useCallback(async () => {
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Format URL if needed
      let formattedUrl = url.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `https://${formattedUrl}`;
      }

      // Explicitly get session to pass auth token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error('Please sign in to fetch content from URLs.');
      }

      const { data, error: fnError } = await supabase.functions.invoke('scrape-url', {
        body: { url: formattedUrl },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (fnError) throw fnError;
      if (!data.success) throw new Error(data.error || 'Failed to scrape URL');

      const parsed = parseTextContent(data.text);
      onTextParsed(parsed, data.title || 'Web Article', 'url');
      toast.success('Web article content fetched successfully');
    } catch (err) {
      console.error('Error scraping URL:', err);
      const msg = err instanceof Error ? err.message : 'Failed to fetch URL content';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [url, onTextParsed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="w-full max-w-2xl mx-auto mt-3"
    >
      {/* Mode Toggle */}
      <div className="flex justify-center gap-2">
        <motion.button
          onClick={() => toggleMode('paste')}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-300 ${mode === 'paste'
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary/50 text-secondary-foreground hover:bg-secondary'
            }`}
        >
          <Type className="w-3.5 h-3.5" />
          Paste TXT
        </motion.button>
        <motion.button
          onClick={() => toggleMode('upload')}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-300 ${mode === 'upload'
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary/50 text-secondary-foreground hover:bg-secondary'
            }`}
        >
          <Upload className="w-3.5 h-3.5" />
          Upload File
        </motion.button>
        <motion.button
          onClick={() => toggleMode('url')}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-300 ${mode === 'url'
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary/50 text-secondary-foreground hover:bg-secondary'
            }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          From URL
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'paste' && (
          <motion.div
            key="paste"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mt-6"
          >
            <div className="glass-panel p-6">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your text here..."
                className="w-full h-48 bg-transparent resize-none outline-none text-foreground placeholder:text-muted-foreground font-body leading-relaxed"
              />
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-border/50">
                <span className="text-sm text-muted-foreground">
                  {text.split(/\s+/).filter(w => w).length} words
                </span>
                <button
                  onClick={handleTextSubmit}
                  disabled={!text.trim()}
                  className="control-button disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Video
                </button>
              </div>
            </div>
          </motion.div>
        )}
        {mode === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mt-6"
          >
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`upload-zone ${isDragging ? 'dragging' : ''}`}
            >
              <input
                type="file"
                accept=".txt,.doc,.docx,.pdf,.epub"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-4">
                  {isLoading ? (
                    <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                  ) : fileName ? (
                    <div className="flex items-center gap-3 text-foreground">
                      <FileText className="w-8 h-8 text-accent" />
                      <span className="font-medium">{fileName}</span>
                      <button
                        onClick={(e) => { e.preventDefault(); setFileName(null); }}
                        className="p-1 hover:bg-muted rounded-full transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <p className="text-foreground font-medium mb-1">
                          Drop your file here or click to browse
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Supports TXT, DOCX, PDF, EPUB
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </label>
            </div>
          </motion.div>
        )}
        {mode === 'url' && (
          <motion.div
            key="url"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mt-6"
          >
            <div className="glass-panel p-6">
              <div className="flex items-center gap-3 mb-4">
                <LinkIcon className="w-5 h-5 text-muted-foreground" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground font-body"
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Paste a URL to a news article, blog post, or any webpage. We'll extract the main content and remove ads and navigation.
              </p>
              <div className="flex justify-end pt-4 border-t border-border/50">
                <button
                  onClick={handleUrlSubmit}
                  disabled={!url.trim() || isLoading}
                  className="control-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    'Fetch Content'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-center text-destructive text-sm"
        >
          {error}
        </motion.p>
      )}
    </motion.div>
  );
}
