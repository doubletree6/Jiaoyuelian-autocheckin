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

    bg_img = cv2.cvtColor(np.array(bg_pil), cv2.COLOR_RGB2BGR)
    jigsaw_rgba = np.array(jigsaw_pil)
    
    print(f"BG size: {bg_img.shape}", file=sys.stderr)
    print(f"Jigsaw size: {jigsaw_rgba.shape}", file=sys.stderr)

    # Extract jigsaw alpha channel
    if jigsaw_rgba.shape[2] == 4:
        alpha = jigsaw_rgba[:,:,3]
        # Find the non-transparent region
        coords = cv2.findNonZero(255 - alpha)
        if coords is not None:
            x, y, w, h = cv2.boundingRect(coords)
            jigsaw_piece = jigsaw_rgba[y:y+h, x:x+w, :3]
            print(f"Jigsaw piece: {w}x{h} at {x},{y}", file=sys.stderr)
        else:
            jigsaw_piece = jigsaw_rgba[:,:,:3]
    else:
        jigsaw_piece = jigsaw_rgba[:,:,:3]
    
    # Scale down if @2x
    scale = 2 if bg_img.shape[1] > 400 else 1
    if scale > 1:
        bg_img = cv2.resize(bg_img, (bg_img.shape[1]//scale, bg_img.shape[0]//scale))
        jigsaw_piece = cv2.resize(jigsaw_piece, (jigsaw_piece.shape[1]//scale, jigsaw_piece.shape[0]//scale))
    
    print(f"After scaling - BG: {bg_img.shape}, Jigsaw: {jigsaw_piece.shape}", file=sys.stderr)
    
    bg_gray = cv2.cvtColor(bg_img, cv2.COLOR_BGR2GRAY)
    jig_gray = cv2.cvtColor(jigsaw_piece, cv2.COLOR_BGR2GRAY)
    
    # Template matching
    result = cv2.matchTemplate(bg_gray, jig_gray, cv2.TM_CCOEFF_NORMED)
    min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)
    print(f"Template match: max_val={max_val}, max_loc={max_loc}", file=sys.stderr)
    
    template_x = max_loc[0]
    
    # Also try edge-based matching
    bg_edges = cv2.Canny(bg_gray, 50, 150)
    jig_edges = cv2.Canny(jig_gray, 50, 150)
    
    result2 = cv2.matchTemplate(bg_edges, jig_edges, cv2.TM_CCOEFF_NORMED)
    min_val2, max_val2, min_loc2, max_loc2 = cv2.minMaxLoc(result2)
    print(f"Edge match: max_val={max_val2}, max_loc={max_loc2}", file=sys.stderr)
    
    # Use template match result (usually more accurate)
    # The position is where the jigsaw piece should start
    return template_x

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
