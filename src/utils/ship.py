# configuração para a criação de imagem do comando !ship

import sys
import os
import random
from PIL import Image, ImageDraw, ImageOps, ImageFont
import urllib.request
import io

def get_font(size, bold=False):
    font_paths = [
        "/system/fonts/Roboto-Bold.ttf" if bold else "/system/fonts/Roboto-Regular.ttf",
        "/system/fonts/DroidSans-Bold.ttf" if bold else "/system/fonts/DroidSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    ]
    for path in font_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except:
                pass
    return ImageFont.load_default()

def draw_heart(draw, x, y, size, fill_color):
    r = size // 2
    draw.ellipse([x - r, y - r // 2, x, y + r // 2], fill=fill_color)
    draw.ellipse([x, y - r // 2, x + r, y + r // 2], fill=fill_color)
    points = [
        (x - r, y),
        (x + r, y),
        (x, y + r * 1.3)
    ]
    draw.polygon(points, fill=fill_color)

def draw_star(draw, x, y, size, fill_color):
    # Desenha uma estrela/sparkle de 4 pontas
    points = [
        (x, y - size),
        (x + size // 3, y - size // 3),
        (x + size, y),
        (x + size // 3, y + size // 3),
        (x, y + size),
        (x - size // 3, y + size // 3),
        (x - size, y),
        (x - size // 3, y - size // 3)
    ]
    draw.polygon(points, fill=fill_color)

def create_ship_card(pfp1_url, pfp2_url, percentage, output_path):
    width, height = 800, 600
    
    # 1. Fundo base com degradê em tons de rosa/vinho suave
    base = Image.new("RGBA", (width, height), (30, 12, 22, 255))
    draw = ImageDraw.Draw(base)

    for y in range(height):
        r = int(25 + (y / height) * 35)
        g = int(10 + (y / height) * 15)
        b = int(25 + (y / height) * 30)
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

    # --- ENFEITES DO FUNDO (FORA DO QUADRADO) ---
    random.seed(777)
    
    # Corações fora do card
    for _ in range(25):
        hx = random.randint(20, width - 20)
        hy = random.randint(20, height - 20)
        # Evita desenhar exatamente em cima do painel central se estiver muito dentro
        if 60 < hx < 740 and 35 < hy < 565 and random.random() > 0.2:
            continue
        hs = random.randint(18, 42)
        alpha = random.randint(60, 150)
        draw_heart(draw, hx, hy, hs, (255, 140, 190, alpha))

    # Estrelas e sparkles fora do card
    for _ in range(20):
        sx = random.randint(15, width - 15)
        sy = random.randint(15, height - 15)
        ss = random.randint(6, 14)
        alpha = random.randint(100, 220)
        draw_star(draw, sx, sy, ss, (255, 255, 255, alpha))

    # Bolhas de luz (bokeh) fora do card
    for _ in range(30):
        bx = random.randint(10, width - 10)
        by = random.randint(10, height - 10)
        br = random.randint(3, 8)
        alpha = random.randint(40, 100)
        draw.ellipse([bx-br, by-br, bx+br, by+br], fill=(255, 180, 220, alpha))

    # 2. Painel central flutuante
    card_x, card_y, card_w, card_h = 60, 35, 680, 530
    radius = 30
    
    # Sombra do painel
    shadow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle([card_x, card_y+15, card_x+card_w, card_y+card_h], radius=radius, fill=(0, 0, 0, 190))
    base = Image.alpha_composite(base, shadow)
    draw = ImageDraw.Draw(base)

    # Fundo do painel em tom rosa escuro sofisticado
    draw.rounded_rectangle([card_x, card_y, card_x+card_w, card_y+card_h], radius=radius, fill=(48, 18, 38, 250))
    
    # --- ENFEITES DENTRO DO QUADRADO ---
    # Corações delicados dentro do painel
    for _ in range(12):
        hx = random.randint(card_x + 40, card_x + card_w - 40)
        hy = random.randint(card_y + 40, card_y + card_h - 40)
        hs = random.randint(12, 24)
        alpha = random.randint(35, 75)
        draw_heart(draw, hx, hy, hs, (255, 160, 205, alpha))

    # Estrelinhas e sparkles dentro do painel
    for _ in range(15):
        sx = random.randint(card_x + 30, card_x + card_w - 30)
        sy = random.randint(card_y + 30, card_y + card_h - 30)
        ss = random.randint(4, 9)
        alpha = random.randint(80, 180)
        draw_star(draw, sx, sy, ss, (255, 220, 240, alpha))

    # Borda iluminada do painel
    draw.rounded_rectangle([card_x, card_y, card_x+card_w, card_y+card_h], radius=radius, outline=(244, 114, 182, 180), width=3)

    # Título superior
    font_title = get_font(18, bold=True)
    draw.text((width // 2, 70), "♥   MATCH PERFEITO   ♥", fill=(252, 165, 165), anchor="mm", font=font_title)

    # Função para cortar a foto circular maior
    def get_avatar(url):
        size = 180  # Fotos grandes
        mask = Image.new("L", (size, size), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.ellipse((0, 0, size, size), fill=255)

        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as resp:
                img_data = resp.read()
                avatar = Image.open(io.BytesIO(img_data)).convert("RGBA")
        except:
            avatar = Image.new("RGBA", (size, size), (100, 50, 80, 255))

        avatar = ImageOps.fit(avatar, (size, size), centering=(0.5, 0.5))
        
        output = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        output.paste(avatar, (0, 0), mask)
        return output

    # 3. Fotos maiores e bem separadas
    av1 = get_avatar(pfp1_url)
    av2 = get_avatar(pfp2_url)

    x1, x2, y_av = 175, 445, 115

    base.paste(av1, (x1, y_av), av1)
    base.paste(av2, (x2, y_av), av2)

    # Molduras brilhantes em volta das fotos
    draw.ellipse([x1 - 3, y_av - 3, x1 + 183, y_av + 183], outline=(236, 72, 153, 255), width=5)
    draw.ellipse([x2 - 3, y_av - 3, x2 + 183, y_av + 183], outline=(236, 72, 153, 255), width=5)

    # Sinal de mais (+) perfeitamente centralizado entre as fotos
    plus_x = width // 2             # 400 exato (centro da tela)
    plus_y = y_av + (180 // 2)      # 205 (centro vertical exato das fotos)
    
    draw.ellipse([plus_x - 22, plus_y - 22, plus_x + 22, plus_y + 22], fill=(60, 20, 45, 255))
    draw.ellipse([plus_x - 22, plus_y - 22, plus_x + 22, plus_y + 22], outline=(244, 114, 182, 220), width=3)
    
    font_plus = get_font(32, bold=True)
    draw.text((plus_x, plus_y), "+", fill=(255, 255, 255), anchor="mm", font=font_plus)

    # 4. Porcentagem gigante centralizada
    font_pct = get_font(64, bold=True)
    draw.text((width // 2, 360), f"{percentage}%", fill=(255, 255, 255), anchor="mm", font=font_pct)

    # 5. Barra de progresso moderna com degradê rosa
    bar_x, bar_y, bar_w, bar_h = 200, 435, 400, 16
    draw.rounded_rectangle([bar_x, bar_y, bar_x+bar_w, bar_y+bar_h], radius=8, fill=(30, 10, 22, 255))
    
    if percentage > 0:
        filled_w = max(16, int((bar_w * percentage) / 100))
        draw.rounded_rectangle([bar_x, bar_y, bar_x+filled_w, bar_y+bar_h], radius=8, fill=(236, 72, 153, 255))

    base.convert("RGB").save(output_path, "JPEG", quality=95)

if __name__ == "__main__":
    pfp1 = sys.argv[1] if len(sys.argv) > 1 else ""
    pfp2 = sys.argv[2] if len(sys.argv) > 2 else ""
    pct = int(sys.argv[3]) if len(sys.argv) > 3 else 50
    out = sys.argv[4] if len(sys.argv) > 4 else "output.jpg"
    create_ship_card(pfp1, pfp2, pct, out)
