from PIL import Image, ImageSequence

# Paths
input_path = "/Users/paul/.gemini/antigravity/brain/beba3247-e4ab-4a34-8c83-abef08095ee5/full_txt_demo_1769245904905.webp"
output_path = "src/assets/videos/full_txt_demo.webp"

# Cut settings
seconds_to_cut = 7
speed_multiplier = 2.0

with Image.open(input_path) as im:
    # Use an iterator to get all frames
    frames = [frame.copy() for frame in ImageSequence.Iterator(im)]
    
    # Calculate original duration
    total_duration_ms = sum(frame.info.get('duration', 0) for frame in frames)
    print(f"Original duration: {total_duration_ms} ms, Frames: {len(frames)}")
    
    # Calculate target duration (remove last 7 seconds)
    target_duration_ms = total_duration_ms - (seconds_to_cut * 1000)
    print(f"Target duration before speedup: {target_duration_ms} ms")
    
    current_ms = 0
    kept_frames = []
    
    for frame in frames:
        dur = frame.info.get('duration', 100) # Default 100ms if missing
        if current_ms + dur > target_duration_ms:
            break
        
        # Apply speedup (half the duration)
        new_dur = int(dur / speed_multiplier)
        frame.info['duration'] = new_dur
        kept_frames.append(frame)
        current_ms += dur

    print(f"New frame count: {len(kept_frames)}")
    
    if kept_frames:
        # Save
        kept_frames[0].save(
            output_path,
            save_all=True,
            append_images=kept_frames[1:],
            loop=0,
            duration=[f.info['duration'] for f in kept_frames],
            optimize=True
        )
        print(f"Saved to {output_path}")
    else:
        print("Error: No frames left after trimming!")
