#!/usr/bin/env python3
import base64
import struct

# Crear un favicon ICO simple de 16x16 píxeles
# Header ICO (6 bytes)
ico_header = struct.pack('<HHH', 0, 1, 1)  # Reserved, Type, Count

# Directory entry (16 bytes)
width = 16
height = 16
colors = 0  # 0 = 256+ colors
reserved = 0
planes = 1
bpp = 32  # bits per pixel
size = 16 * 16 * 4 + 40  # bitmap size + header
offset = 22  # offset to bitmap data

directory = struct.pack('<BBBBHHII', width, height, colors, reserved, planes, bpp, size, offset)

# Bitmap header (40 bytes)
bitmap_header = struct.pack('<IIIHHIIIIII', 
    40,        # header size
    16,        # width
    32,        # height (16*2 for XOR and AND masks)
    1,         # planes
    32,        # bits per pixel
    0,         # compression
    16*16*4,   # image size
    0, 0, 0, 0 # resolution and colors
)

# Pixel data (16x16 BGRA)
pixels = bytearray()
for y in range(16):
    for x in range(16):
        # Crear un círculo simple azul
        dx = x - 8
        dy = y - 8
        dist = (dx*dx + dy*dy) ** 0.5
        
        if dist <= 7:
            if dist <= 3:
                # Centro blanco
                pixels.extend([255, 255, 255, 255])  # BGRA
            elif dist <= 5:
                # Azul claro
                pixels.extend([250, 165, 96, 255])   # BGRA
            else:
                # Azul oscuro
                pixels.extend([175, 64, 30, 255])    # BGRA
        else:
            # Transparente
            pixels.extend([0, 0, 0, 0])

# AND mask (1 bit per pixel, 16x16 = 32 bytes)
and_mask = bytearray(32)  # Todo transparente

# Combinar todo
ico_data = ico_header + directory + bitmap_header + pixels + and_mask

# Escribir el archivo
with open('/workspaces/SMART_STUDENT_HTML/public/favicon-small.ico', 'wb') as f:
    f.write(ico_data)

print("Favicon pequeño creado: favicon-small.ico")
