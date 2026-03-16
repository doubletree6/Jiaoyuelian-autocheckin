#!/usr/bin/env python3
import cv2
import numpy as np
import sys

bg_path = sys.argv[1]
jig_path = sys.argv[2]

bg = cv2.imread(bg_path)
jig = cv2.imread(jig_path, cv2.IMREAD_UNCHANGED)

if len(jig.shape) == 3 and jig.shape[2] == 4:
    alpha = jig[:,:,3]
    coords = cv2.findNonZero(alpha)
    if coords is not None:
        x, y, w, h = cv2.boundingRect(coords)
        bg_gray = cv2.cvtColor(bg, cv2.COLOR_BGR2GRAY)
        jig_rgb = jig[:,:,:3]
        mask = alpha
        masked_jig = cv2.bitwise_and(jig_rgb, jig_rgb, mask=mask)
        result = cv2.matchTemplate(bg_gray, cv2.cvtColor(masked_jig, cv2.COLOR_BGR2GRAY), cv2.TM_CCOEFF_NORMED)
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)
        offset = max_loc[0]
        scaled = int(offset * 2) + 45
        print(scaled)
