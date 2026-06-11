import os
from PIL import Image

def main():
    img_path = r"C:\Users\admin\.gemini\antigravity\brain\ae4599ed-560e-4648-ab5d-b637f467e3c3\media__1781157838610.png"
    if not os.path.exists(img_path):
        print(f"Error: image not found at {img_path}")
        return

    img = Image.open(img_path)
    rgba = img.convert("RGBA")
    width, height = rgba.size
    print(f"Original size: {width}x{height}")

    # Get background color from top-left corner
    bg_r, bg_g, bg_b, _ = rgba.getpixel((0, 0))
    print(f"Detected background color: R={bg_r}, G={bg_g}, B={bg_b}")

    # Remove background
    datas = rgba.getdata()
    new_data = []
    tolerance = 20  # Tolerance for color matching

    for item in datas:
        r, g, b, a = item
        # Calculate distance to background color
        dist = ((r - bg_r) ** 2 + (g - bg_g) ** 2 + (b - bg_b) ** 2) ** 0.5
        if dist < tolerance:
            new_data.append((0, 0, 0, 0))  # Transparent
        else:
            new_data.append(item)

    rgba.putdata(new_data)

    # Get bounding box of non-transparent content
    bbox = rgba.getbbox()
    if bbox:
        # Crop to bounding box
        cropped_img = rgba.crop(bbox)
        
        # Add a small padding (e.g. 6px) to avoid cutting off edge pixels/anti-aliasing
        padding = 8
        padded_width = cropped_img.width + padding * 2
        padded_height = cropped_img.height + padding * 2
        
        final_img = Image.new("RGBA", (padded_width, padded_height), (0, 0, 0, 0))
        final_img.paste(cropped_img, (padding, padding))
        
        # Save as PNG
        output_path = r"c:\hungvt84\Gold\gold-tracker\public\assets\heart.png"
        final_img.save(output_path, "PNG")
        print(f"Successfully processed heart image. Saved to {output_path}")
    else:
        print("Error: Bounding box not found, image is empty.")

if __name__ == "__main__":
    main()
