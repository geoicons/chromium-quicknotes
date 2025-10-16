#!/usr/bin/env python3
"""
Icon Resizer for Quick Notes Extension
Resizes the web-app-manifest-512x512.png to create all required icon sizes.
"""

import os
from PIL import Image
import sys

def resize_icons():
    """Resize the source image to all required icon sizes."""
    
    # Source image path
    source_image = "../icons/web-app-manifest-512x512.png"
    
    # Required icon sizes
    icon_sizes = [
        (16, "icon16.png"),
        (32, "icon32.png"), 
        (48, "icon48.png"),
        (128, "icon128.png")
    ]
    
    # Check if source image exists
    if not os.path.exists(source_image):
        print(f"Error: Source image not found at {source_image}")
        print("Please make sure web-app-manifest-512x512.png exists in the icons/ directory")
        return False
    
    try:
        # Open the source image
        with Image.open(source_image) as img:
            print(f"Source image: {img.size[0]}x{img.size[1]} pixels")
            
            # Create icons directory if it doesn't exist
            icons_dir = "../icons"
            os.makedirs(icons_dir, exist_ok=True)
            
            # Resize to each required size
            for size, filename in icon_sizes:
                # Resize with high quality resampling
                resized = img.resize((size, size), Image.Resampling.LANCZOS)
                
                # Save the resized image
                output_path = os.path.join(icons_dir, filename)
                resized.save(output_path, "PNG", optimize=True)
                
                print(f"Created {filename}: {size}x{size} pixels")
            
            print("\n✅ All icons created successfully!")
            print("You can now reload the extension to see the new icons.")
            return True
            
    except FileNotFoundError:
        print(f"Error: Could not find source image at {source_image}")
        return False
    except Exception as e:
        print(f"Error processing image: {e}")
        return False

def main():
    """Main function to run the icon resizer."""
    print("🚀 RequestRocket Icon Resizer")
    print("=" * 40)
    
    # Check if PIL is available
    try:
        from PIL import Image
    except ImportError:
        print("Error: PIL (Pillow) is not installed.")
        print("Please install it with: pip install Pillow")
        return False
    
    # Run the resizer
    success = resize_icons()
    
    if success:
        print("\n🎉 Icon resizing completed!")
    else:
        print("\n❌ Icon resizing failed!")
        return False
    
    return True

if __name__ == "__main__":
    main()

