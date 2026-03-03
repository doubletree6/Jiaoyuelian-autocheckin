import cv2
import numpy as np
import sys
import base64
import json
from io import BytesIO
from PIL import Image

def find_gap_position(bg_base64, jigsaw_base64):
    try:
        bg_data = base64.b64decode(bg_base64)
        jigsaw_data = base64.b64decode(jigsaw_base64)
    except Exception as e:
        raise ValueError(f"Base64 decoding failed: {e}")

    try:
        bg_pil = Image.open(BytesIO(bg_data))
        jigsaw_pil = Image.open(BytesIO(jigsaw_data))
    except Exception as e:
        raise IOError(f"Pillow could not open image data: {e}")

    # Convert to OpenCV format
    bg_img = cv2.cvtColor(np.array(bg_pil), cv2.COLOR_RGB2BGR)
    jigsaw_img = cv2.cvtColor(np.array(jigsaw_pil), cv2.COLOR_RGBA2BGRA)
    
    print(f"BG size: {bg_img.shape}", file=sys.stderr)
    print(f"Jigsaw size: {jigsaw_img.shape}", file=sys.stderr)

    # Get jigsaw piece dimensions (without alpha channel)
    jigsaw_gray = cv2.cvtColor(jigsaw_img, cv2.COLOR_BGRA2BGR)
    jigsaw_h, jigsaw_w = jigsaw_gray.shape[:2]
    print(f"Jigsaw: {jigsaw_w}x{jigsaw_h}", file=sys.stderr)

    # If @2x images, scale down
    scale = 2 if bg_img.shape[1] > 700 else 1
    if scale > 1:
        bg_img = cv2.resize(bg_img, (bg_img.shape[1]//scale, bg_img.shape[0]//scale))
        jigsaw_gray = cv2.resize(jigsaw_gray, (jigsaw_w//scale, jigsaw_h//scale))
        print(f"Scaled BG: {bg_img.shape}", file=sys.stderr)

    # Template matching - slide the jigsaw piece across the background
    bg_gray = cv2.cvtColor(bg_img, cv2.COLOR_BGR2GRAY)
    
    # Use multiple methods and average
    methods = [cv2.TM_CCOEFF_NORMED, cv2.TM_SQDIFF_NORMED]
    best_positions = []
    
    for method in methods:
        result = cv2.matchTemplate(bg_gray, jigsaw_gray, method)
        _, _, _, max_loc = cv2.minMaxLoc(result)
        best_positions.append(max_loc[0])
    
    # Average the positions
    avg_position = int(sum(best_positions) / len(best_positions))
    print(f"Template match positions: {best_positions}, avg: {avg_position}", file=sys.stderr)
    
    # Also try edge matching
    bg_edges = cv2.Canny(bg_gray, 100, 200)
    jigsaw_edges = cv2.Canny(cv2.cvtColor(jigsaw_gray, cv2.COLOR_BGR2GRAY), 100, 200)
    
    result2 = cv2.matchTemplate(bg_edges, jigsaw_edges, cv2.TM_CCOEFF_NORMED)
    _, _, _, max_loc2 = cv2.minMaxLoc(result2)
    edge_position = max_loc2[0]
    print(f"Edge match position: {edge_position}", file=sys.stderr)
    
    # Combine results (weighted average)
    final_position = int(avg_position * 0.7 + edge_position * 0.3)
    print(f"Final position: {final_position}", file=sys.stderr)
    
    return final_position

if __name__ == '__main__':
    try:
        input_data = sys.stdin.read()
        data = json.loads(input_data)
        
        bg_base64_arg = data['background']
        jigsaw_base64_arg = data['jigsaw']

        offset = find_gap_position(bg_base64_arg, jigsaw_base64_arg)
        print(offset)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
