"""
Generate PWA and notification icons for StoreGen platform.
"""
from PIL import Image, ImageDraw

def create_store_icon(size: int, output_path: str):
    # Indigo background #6366f1
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded rectangle background
    radius = int(size * 0.22)
    draw.rounded_rectangle(
        [(0, 0), (size - 1, size - 1)],
        radius=radius,
        fill=(99, 102, 241, 255)
    )

    # Roof / House polygon
    # Points scaled
    stroke = max(2, int(size * 0.06))
    mid_x = size // 2
    roof_top = int(size * 0.22)
    roof_left = int(size * 0.22)
    roof_right = int(size * 0.78)
    eaves_y = int(size * 0.42)
    base_bottom = int(size * 0.78)
    door_w = int(size * 0.18)
    door_top = int(size * 0.52)

    # Draw store body
    draw.line([(roof_left, eaves_y), (mid_x, roof_top), (roof_right, eaves_y)], fill=(255, 255, 255, 255), width=stroke)
    draw.line([(roof_left + stroke//2, eaves_y), (roof_left + stroke//2, base_bottom)], fill=(255, 255, 255, 255), width=stroke)
    draw.line([(roof_right - stroke//2, eaves_y), (roof_right - stroke//2, base_bottom)], fill=(255, 255, 255, 255), width=stroke)
    draw.line([(roof_left, base_bottom), (roof_right, base_bottom)], fill=(255, 255, 255, 255), width=stroke)

    # Door
    door_left = mid_x - door_w // 2
    door_right = mid_x + door_w // 2
    draw.line([(door_left, base_bottom), (door_left, door_top), (door_right, door_top), (door_right, base_bottom)], fill=(255, 255, 255, 255), width=stroke)

    img.save(output_path, "PNG")
    print(f"Created {output_path} ({size}x{size})")

if __name__ == "__main__":
    create_store_icon(72, "platform/public/icon-72.png")
    create_store_icon(192, "platform/public/icon-192.png")
    create_store_icon(512, "platform/public/icon-512.png")
