import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Volume2, VolumeX, Pause, Play, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

interface AtmosphereTrack {
    id: string;
    name: string;
    icon: string;
    url: string;
}

const TRACKS: AtmosphereTrack[] = [
    {
        id: 'jazz',
        name: 'Calming Jazz',
        icon: '🎷',
        url: 'https://www.chosic.com/wp-content/uploads/2021/04/Warm-Jazz.mp3' // Example royalty free link
    },
    {
        id: 'house',
        name: 'Deep House',
        icon: '🏠',
        url: 'https://freetouse.com/music/track-sample.mp3' // Placeholder, user will swap
    },
    {
        id: 'nature',
        name: 'Forest Ambience',
        icon: '🌿',
        url: 'https://www.chosic.com/wp-content/uploads/2021/07/Rain-Sound-And-Rainforest.mp3'
    },
];

interface AtmospherePlayerProps {
    onClose: () => void;
}

export const AtmospherePlayer = ({ onClose }: AtmospherePlayerProps) => {
    const [activeTrack, setActiveTrack] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState([60]);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.loop = true;
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

    const toggleTrack = (track: AtmosphereTrack) => {
        if (activeTrack === track.id) {
            if (isPlaying) {
                audioRef.current?.pause();
                setIsPlaying(false);
            } else {
                audioRef.current?.play();
                setIsPlaying(true);
            }
        } else {
            setActiveTrack(track.id);
            if (audioRef.current) {
                audioRef.current.src = track.url;
                audioRef.current.play();
                setIsPlaying(true);
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="glass-panel p-4 w-72 shadow-2xl space-y-4"
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Music className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-semibold text-sm tracking-tight">Atmosphere</h3>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
                    <X className="w-4 h-4" />
                </Button>
            </div>

            <div className="space-y-2">
                {TRACKS.map((track) => (
                    <button
                        key={track.id}
                        onClick={() => toggleTrack(track)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeTrack === track.id
                                ? 'bg-indigo-500/20 ring-1 ring-indigo-500/50'
                                : 'hover:bg-white/5 active:scale-[0.98]'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xl">{track.icon}</span>
                            <span className={`text-sm font-medium ${activeTrack === track.id ? 'text-indigo-200' : 'text-foreground/80'}`}>
                                {track.name}
                            </span>
                        </div>
                        {activeTrack === track.id && (
                            <div className="flex items-center gap-2">
                                {isPlaying ? (
                                    <div className="flex gap-0.5 h-3 items-end">
                                        {[1, 2, 3].map(i => (
                                            <motion.div
                                                key={i}
                                                animate={{ height: [4, 12, 4] }}
                                                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                                                className="w-1 bg-indigo-400 rounded-full"
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <Play className="w-3 h-3 text-indigo-400 fill-indigo-400" />
                                )}
                            </div>
                        )}
                    </button>
                ))}
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center gap-3 px-1">
                {volume[0] === 0 ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-muted-foreground" />}
                <Slider
                    value={volume}
                    onValueChange={setVolume}
                    max={100}
                    step={1}
                    className="flex-1"
                />
            </div>
        </motion.div>
    );
};
