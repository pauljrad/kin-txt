import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Volume2, VolumeX, Pause, Play, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AtmosphereTrack {
    id: string;
    name: string;
    icon: string;
    url: string;
}

const TRACKS: AtmosphereTrack[] = [
    {
        id: 'jazz',
        name: 'Jazz',
        icon: '',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' // Slow, more relaxing piano/jazz
    }
];

interface AtmospherePlayerProps {
    onClose: () => void;
}

export const AtmospherePlayer = ({ onClose }: AtmospherePlayerProps) => {
    const [activeTrack, setActiveTrack] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [volume, setVolume] = useState([60]);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.loop = true;
            audioRef.current.onerror = () => {
                toast.error("Audio failed to load. Please check your connection.");
                setIsPlaying(false);
                setIsLoading(false);
            };
        }

        return () => {
            audioRef.current?.pause();
            audioRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume[0] / 100;
        }
    }, [volume]);

    const toggleTrack = async (track: AtmosphereTrack) => {
        if (!audioRef.current) return;

        try {
            if (activeTrack === track.id) {
                if (isPlaying) {
                    audioRef.current.pause();
                    setIsPlaying(false);
                } else {
                    setIsLoading(true);
                    await audioRef.current.play();
                    setIsPlaying(true);
                    setIsLoading(false);
                }
            } else {
                setIsLoading(true);
                setActiveTrack(track.id);
                audioRef.current.src = track.url;
                audioRef.current.load();
                await audioRef.current.play();
                setIsPlaying(true);
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Audio error:", error);
            toast.error("Playback blocked or failed. Please try again.");
            setIsPlaying(false);
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="bg-black/95 border border-white/10 p-3 w-64 shadow-2xl space-y-3 rounded-lg overflow-hidden"
        >
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-white/40" />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium">Atmosphere</span>
                </div>
                <button onClick={onClose} className="text-white/20 hover:text-white/60 transition-colors">
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className="space-y-1">
                {TRACKS.map((track) => (
                    <button
                        key={track.id}
                        onClick={() => toggleTrack(track)}
                        className={`w-full flex items-center justify-between p-3 rounded-md transition-all ${activeTrack === track.id
                            ? 'bg-white/5'
                            : 'hover:bg-white/5 active:scale-[0.98]'
                            }`}
                    >
                        <span className={`text-xs tracking-wide transition-all ${activeTrack === track.id ? 'font-bold text-white' : 'font-normal text-white/40'}`}>
                            {track.name}
                        </span>

                        {activeTrack === track.id && (
                            <div className="flex items-center gap-1.5">
                                {isPlaying ? (
                                    <div className="flex gap-0.5 h-2.5 items-end px-1">
                                        {[1, 2, 3].map(i => (
                                            <motion.div
                                                key={i}
                                                animate={{ height: [3, 8, 3] }}
                                                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
                                                className="w-0.5 bg-white/60 rounded-full"
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <Play className="w-2.5 h-2.5 text-white/60 fill-white/60" />
                                )}
                            </div>
                        )}
                    </button>
                ))}
            </div>

            <div className="pt-2 flex items-center gap-3 px-1">
                <Slider
                    value={volume}
                    onValueChange={setVolume}
                    max={100}
                    step={1}
                    className="flex-1 accent-white"
                />
            </div>
        </motion.div>
    );
};
