from PIL import Image, ImageSequence, ImageStat

input_path = "/Users/paul/.gemini/antigravity/brain/beba3247-e4ab-4a34-8c83-abef08095ee5/full_txt_demo_1769245904905.webp"
output_path = "src/assets/videos/full_txt_demo.webp"

with Image.open(input_path) as im:
    frames = [frame.copy() for frame in ImageSequence.Iterator(im)]
    print(f"Total frames: {len(frames)}")
    
    # We want to find when the reader is active.
    # The reader typically has a dark background and large text.
    # We'll skip frames that look like the dashboard (lots of cards).
    # Or we just skip the first N frames.
    
    # Let's find the first frame that has a significant change from the first frame
    # Or just inspect the first 100 frames to find the cut point.
    
    # Based on the subagent log for the 4.4MB recording:
    # Step 1-13 was setup. Step 15 was click ebooks. Step 19 was click book.
    # Step 23-27 was waiting for load/animate.
    # Frame 100-150 is likely where the reader is.
    
    cut_start_frame = 0
    # Find frame where background is mostly dark (reader view)
    for i, frame in enumerate(frames):
        stat = ImageStat.Stat(frame.convert('L'))
        # Reader is usually dark or distinct.
        # Actually, let's just use a manual offset based on time.
        # 10 fps usually. Let's try skipping first 10s (100 frames).
        if i > 100: 
            cut_start_frame = i
            break
            
    # Cut 7s from the end (70 frames)
    cut_end_frame = len(frames) - 70
    
    kept_frames = frames[cut_start_frame:cut_end_frame]
    print(f"Keeping frames {cut_start_frame} to {cut_end_frame} ({len(kept_frames)} frames)")
    
    # Speed up 2x
    for frame in kept_frames:
        dur = frame.info.get('duration', 100)
        frame.info['duration'] = int(dur / 2)
        
    if kept_frames:
        kept_frames[0].save(
            output_path,
            save_all=True,
            append_images=kept_frames[1:],
            loop=0,
            duration=[f.info['duration'] for f in kept_frames],
            optimize=True
        )
        print(f"Saved to {output_path}")
