import os
from PIL import Image, ImageOps, ImageChops

def main():
    img_path = r"C:\Users\admin\.gemini\antigravity\brain\e50b35e6-da6f-4753-bdb9-77e5eb123fa9\media__1780650471743.jpg"
    if not os.path.exists(img_path):
        print(f"Error: image not found at {img_path}")
        return

    img = Image.open(img_path)
    width, height = img.size
    print(f"Original size: {width}x{height}")

    # 1. Clean Square Crop (No Spiral Rings)
    # The spiral rings are on the left. Let's crop starting from ~11.5% of width to ~99.5% of width, and ~0% to ~98% of height to make it a perfect square.
    # Let's adjust values dynamically to get a square.
    left = int(width * 0.115)
    right = int(width * 0.995)
    top = int(height * 0.005)
    bottom = int(height * 0.985)
    
    crop_w = right - left
    crop_h = bottom - top
    size = min(crop_w, crop_h)
    
    # Adjust to make perfect square
    left_adj = left + (crop_w - size) // 2
    top_adj = top + (crop_h - size) // 2
    
    square_img = img.crop((left_adj, top_adj, left_adj + size, top_adj + size))
    square_img = square_img.resize((512, 512), Image.Resampling.LANCZOS)
    
    # Save square app icon (512x512) and (180x180)
    public_dir = r"c:\hungvt84\Gold\gold-tracker\public"
    os.makedirs(public_dir, exist_ok=True)
    
    square_img.save(os.path.join(public_dir, "apple-touch-icon.png"), "PNG")
    square_img.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(public_dir, "icon-192.png"), "PNG")
    square_img.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(public_dir, "icon-512.png"), "PNG")
    print("Saved square icons to public directory.")

    # 2. Transparent Background version
    # Let's also do a version where we remove the white-ish background outside the binder.
    # Convert to RGBA
    rgba = img.convert("RGBA")
    datas = rgba.getdata()
    
    new_data = []
    for item in datas:
        # If color is close to white/grey background on the very edges
        # The background outside the pink notebook is white/grey
        r, g, b, a = item
        # Let's check if it's very close to the outer light background
        # (Typically R > 230, G > 230, B > 230 or similar)
        if r > 240 and g > 240 and b > 240:
            new_data.append((255, 255, 255, 0)) # transparent
        else:
            new_data.append(item)
            
    rgba.putdata(new_data)
    rgba.save(os.path.join(public_dir, "notebook-transparent.png"), "PNG")
    print("Saved transparent version.")

if __name__ == "__main__":
    main()
