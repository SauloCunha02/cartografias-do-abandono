# -*- coding: utf-8 -*-
"""
Gera o PDF do catálogo "Cartografias do Abandono".
Uso:  python tools/build_pdf.py
Saída: Cartografias-do-Abandono.pdf (raiz do projeto)
"""
import io, os, pathlib
import pymupdf
from PIL import Image, ImageDraw, ImageEnhance

ROOT = pathlib.Path(__file__).resolve().parent.parent
IMG  = ROOT / "assets" / "img"
OUT  = ROOT / "Cartografias-do-Abandono.pdf"

# ── página A4 paisagem ──────────────────────────────────────
W, H = 841.89, 595.28
M    = 54.0
CW   = W - 2 * M          # largura útil

# ── paleta (idêntica ao site) ───────────────────────────────
INK      = (0.090, 0.071, 0.051)
INK2     = (0.125, 0.102, 0.075)
BONE     = (0.929, 0.898, 0.839)
BONE3    = (0.812, 0.761, 0.663)
OCRE     = (0.788, 0.569, 0.247)
OCRE2    = (0.878, 0.698, 0.361)
OCREDIM  = (0.541, 0.392, 0.157)
ON_BONE  = (0.141, 0.114, 0.082)
ON_BONE2 = (0.270, 0.227, 0.173)
ON_BONEd = (0.420, 0.373, 0.306)
ON_INKd  = (0.635, 0.580, 0.494)

# ── fontes do sistema ───────────────────────────────────────
FDIR = pathlib.Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts"
def pick(*names):
    for n in names:
        p = FDIR / n
        if p.exists():
            return str(p)
    raise SystemExit("Fonte não encontrada: " + ", ".join(names))

F_REG = pick("pala.ttf", "georgia.ttf", "times.ttf")
F_BLD = pick("palab.ttf", "georgiab.ttf", "timesbd.ttf")
F_ITA = pick("palai.ttf", "georgiai.ttf", "timesi.ttf")
F_SAN = pick("calibrib.ttf", "trebucbd.ttf", "arialbd.ttf")
F_SNR = pick("calibri.ttf", "trebuc.ttf", "arial.ttf")

FONTS = {"ser": F_REG, "serb": F_BLD, "seri": F_ITA, "san": F_SAN, "sanr": F_SNR}
MEAS  = {k: pymupdf.Font(fontfile=v) for k, v in FONTS.items()}

doc = pymupdf.open()

def newpage(bg=INK):
    p = doc.new_page(width=W, height=H)
    for k, v in FONTS.items():
        p.insert_font(fontname=k, fontfile=v)
    p.draw_rect(pymupdf.Rect(0, 0, W, H), color=None, fill=bg)
    return p

# ── helpers de texto ────────────────────────────────────────
def tracked(page, x, y, text, size=7.0, color=OCRE, track=0.24, font="san", upper=True):
    """Rótulo em caixa alta com entreletras — devolve a largura ocupada."""
    s = text.upper() if upper else text
    f = MEAS[font]
    cx = x
    for ch in s:
        page.insert_text((cx, y), ch, fontname=font, fontsize=size, color=color)
        cx += f.text_length(ch, size) + size * track
    return cx - x

def fit(page, rect, text, font="ser", size=10.5, color=ON_BONE2, align=0, lh=1.5, floor=6.5):
    """Escreve o texto reduzindo o corpo só o necessário para caber. Nunca some."""
    s = size
    while s > floor:
        if page.insert_textbox(rect, text, fontname=font, fontsize=s,
                               align=align, lineheight=lh, render_mode=3) >= 0:
            break
        s -= 0.25
    page.insert_textbox(rect, text, fontname=font, fontsize=s, color=color, align=align, lineheight=lh)
    return s

# box() é um alias de fit(): garante que nenhum bloco desapareça por overflow
box = fit

def fit_all(page, rects, texts, font="ser", size=10.5, color=ON_BONE2, align=0, lh=1.5, floor=6.5):
    """Mesmo corpo em colunas paralelas: usa o maior tamanho que serve para todas."""
    s = size
    while s > floor:
        if all(page.insert_textbox(r, t, fontname=font, fontsize=s, align=align,
                                   lineheight=lh, render_mode=3) >= 0
               for r, t in zip(rects, texts)):
            break
        s -= 0.25
    for r, t in zip(rects, texts):
        page.insert_textbox(r, t, fontname=font, fontsize=s, color=color, align=align, lineheight=lh)
    return s

def used(page, rect, text, font="ser", size=10.5, lh=1.5):
    """Altura realmente ocupada pelo texto dentro de rect."""
    left = page.insert_textbox(rect, text, fontname=font, fontsize=size,
                               lineheight=lh, render_mode=3)
    return rect.height - max(0.0, left)

def rule(page, x, y, w, color=OCRE, thick=0.7):
    page.draw_line(pymupdf.Point(x, y), pymupdf.Point(x + w, y), color=color, width=thick)

def running(page, n, total, label, dark=True):
    c  = ON_INKd if dark else ON_BONEd
    tracked(page, M, 34, label, 6.2, c, 0.22)
    page.insert_text((W - M - 26, H - 30), f"{n:02d}", fontname="san", fontsize=7.5,
                     color=OCRE if dark else OCREDIM)
    page.insert_text((W - M - 14, H - 30), f"/{total:02d}", fontname="sanr", fontsize=7.5, color=c)

# ── helpers de imagem ───────────────────────────────────────
def crop(path, w, h, dark=0.0, sat=0.86, scrim=None):
    """Recorta preenchendo w×h (pt→px a 150dpi) e aplica tratamento."""
    px_w, px_h = int(w * 150 / 72), int(h * 150 / 72)
    im = Image.open(path).convert("RGB")
    r_t, r_i = px_w / px_h, im.width / im.height
    if r_i > r_t:
        nw = int(im.height * r_t); im = im.crop(((im.width - nw) // 2, 0, (im.width + nw) // 2, im.height))
    else:
        nh = int(im.width / r_t); im = im.crop((0, (im.height - nh) // 2, im.width, (im.height + nh) // 2))
    im = im.resize((px_w, px_h), Image.LANCZOS)
    if sat != 1.0:  im = ImageEnhance.Color(im).enhance(sat)
    if dark:        im = ImageEnhance.Brightness(im).enhance(1 - dark)
    if scrim:
        ov = Image.new("L", im.size, 0)
        d  = ImageDraw.Draw(ov)
        for i in range(im.size[1]):
            t = i / im.size[1]
            d.line([(0, i), (im.size[0], i)], fill=int(255 * scrim(t)))
        im = Image.composite(Image.new("RGB", im.size, (23, 18, 13)), im, ov)
    b = io.BytesIO(); im.save(b, "JPEG", quality=88, optimize=True)
    return b.getvalue()

def place(page, rect, path, **kw):
    page.insert_image(rect, stream=crop(path, rect.width, rect.height, **kw))

# ═══════════════════════════════════════════════════════════
# P1 — CAPA
# ═══════════════════════════════════════════════════════════
p = newpage(INK)
place(p, pymupdf.Rect(0, 0, W, H), IMG / "capa.jpg", sat=0.78,
      scrim=lambda t: min(0.92, 0.30 + 0.62 * t ** 1.7))
p.draw_rect(pymupdf.Rect(0, 0, W * 0.62, H), color=None, fill=INK, fill_opacity=0.30)

tracked(p, M, 258, "Catálogo fotográfico & proposição didática", 7.4, OCRE2, 0.26)
p.insert_text((M - 3, 340), "Cartografias", fontname="ser",  fontsize=64, color=BONE)
p.insert_text((M - 3, 404), "do Abandono", fontname="seri", fontsize=64, color=OCRE2)
rule(p, M, 432, 62, OCRE, 0.9)
box(p, pymupdf.Rect(M, 450, M + 330, 510),
    "memória, esquecimento e fotografia\nno ensino de História para o Ensino Médio",
    "seri", 13, BONE3, lh=1.45)
p.insert_text((M - 1, 528), "Francisco das Chagas Barroso Uchoa", fontname="ser", fontsize=11.5, color=BONE)
tracked(p, M, H - 42, "ProfHistória · UESPI    ·    Guaraciaba do Norte — CE    ·    2026", 6.6, ON_INKd, 0.2)

# ═══════════════════════════════════════════════════════════
# P2 — APRESENTAÇÃO
# ═══════════════════════════════════════════════════════════
p = newpage(BONE)
running(p, 2, 11, "Cartografias do Abandono", dark=False)
tracked(p, M, 96, "§ 01 — Abertura", 7, OCREDIM, 0.26)
p.insert_text((M - 2, 148), "Apresentação", fontname="ser", fontsize=42, color=ON_BONE)
rule(p, M, 172, 46, OCREDIM, 0.8)

BAND = 88                        # faixa fotográfica no rodapé
TXT_B = H - 54 - BAND - 26       # base das colunas de texto
SBW  = 178
colw = (CW - SBW - 76) / 2
c1 = pymupdf.Rect(M, 200, M + colw, TXT_B)
c2 = pymupdf.Rect(M + colw + 34, 200, M + colw * 2 + 34, TXT_B)
sb = pymupdf.Rect(W - M - SBW, 200, W - M, H - 54)   # barra lateral usa a altura toda

t1 = ("Prezados professores(as) e pesquisadores(as), apresentamos nessa travessia o nosso catálogo "
      "“Cartografias do Abandono: memória, esquecimento e fotografia no ensino de História para o "
      "Ensino Médio”, objeto pensado como proposição didática, fruto de uma pesquisa desenvolvida no "
      "Mestrado Profissional em Ensino de História, ProfHistória, da Universidade Estadual do Piauí "
      "(UESPI), Campus Alexandre Alves de Oliveira, com orientação do Professor Doutor Fernando "
      "Bagiotto Botton.\n\n"
      "O trabalho compõe a pesquisa intitulada Cartografias do Abandono: estudo sobre o esquecimento "
      "como objeto para o Ensino de História, escrita com a intenção de permitir aos professores de "
      "História e Ciências Humanas do Ensino Médio trabalharem de forma mais lúdica e criativa "
      "conceitos abstratos como esquecimento, temporalidade e memória.")
t2 = ("O catálogo, portanto, conecta os aspectos artísticos da fotografia — ao criar uma linguagem "
      "imagética sobre os esquecimentos, memórias e patrimônios — com o aprendizado histórico. Assim, "
      "possibilita aos professores refletir, a partir dos registros fotográficos, estratégias de ensino "
      "e aprendizagem históricas.\n\n"
      "As séries fotográficas apresentadas aqui irão narrar os elementos constitutivos da realidade "
      "contemporânea, marcada por uma aceleração da memória e dos ritos sociais, tendo a ruína, o "
      "descarte e o abandono uma configuração estética que marca não somente aspectos materiais, mas "
      "também subjetivos e simbólicos. Nessa jornada, esperamos que a linguagem fotográfica possa "
      "estimular o pensamento crítico e criativo das aulas de História.")
fit_all(p, [c1, c2], [t1, t2], "ser", 11.4, ON_BONE2, align=3, lh=1.66)

y = 200
p.draw_line(pymupdf.Point(sb.x0, y - 14), pymupdf.Point(sb.x1, y - 14), color=ON_BONEd, width=0.6)
for k, v in [("Programa", "Mestrado Profissional em Ensino de História — ProfHistória"),
             ("Instituição", "Universidade Estadual do Piauí (UESPI), Campus Alexandre Alves de Oliveira"),
             ("Orientação", "Prof. Dr. Fernando Bagiotto Botton"),
             ("Destinatários", "Professores de História e Ciências Humanas do Ensino Médio"),
             ("Série 01", "Guaraciaba do Norte, Ceará — março de 2026")]:
    tracked(p, sb.x0, y + 4, k, 6.2, OCREDIM, 0.2)
    hgt = used(p, pymupdf.Rect(sb.x0, y + 14, sb.x1, sb.y1), v, "ser", 9.2, 1.48)
    p.insert_textbox(pymupdf.Rect(sb.x0, y + 14, sb.x1, y + 16 + hgt),
                     v, fontname="ser", fontsize=9.2, color=ON_BONE2, lineheight=1.48)
    y += 14 + hgt + 18
    p.draw_line(pymupdf.Point(sb.x0, y - 9), pymupdf.Point(sb.x1, y - 9), color=(0.78, 0.74, 0.67), width=0.4)

# faixa fotográfica sob as colunas de texto
band = pymupdf.Rect(M, H - 54 - BAND, c2.x1, H - 54)
place(p, band, IMG / "foto-01.jpg", sat=0.8)
p.draw_rect(band, color=None, fill=INK, fill_opacity=0.18)

# ═══════════════════════════════════════════════════════════
# P3 — DIVISOR SÉRIE 01
# ═══════════════════════════════════════════════════════════
p = newpage(INK2)
p.insert_text((W - 330, 470), "01", fontname="ser", fontsize=300,
              color=OCRE, render_mode=1, stroke_opacity=0.16, border_width=0.4)
running(p, 3, 11, "Série 01")
tracked(p, M, 210, "Série fotográfica", 7.4, OCRE, 0.26)
p.insert_text((M - 3, 288), "Casas de farinha", fontname="ser", fontsize=54, color=BONE)
p.insert_text((M - 3, 344), "e engenhos velhos", fontname="ser", fontsize=54, color=BONE)
p.insert_text((M, 388), "cultura material e imaterial e esquecimento",
              fontname="seri", fontsize=15, color=OCRE2)
rule(p, M, 418, 200, OCRE, 0.8)

# ═══════════════════════════════════════════════════════════
# P4 — PRANCHA 01
# ═══════════════════════════════════════════════════════════
p = newpage(INK)
place(p, pymupdf.Rect(0, 0, W, H - 52), IMG / "foto-01.jpg", sat=0.88)
tracked(p, M, H - 22, "Prancha 01", 6.8, OCRE, 0.24)
p.insert_text((M + 88, H - 22), "Casa de farinha — Guaraciaba do Norte, Ceará. Registro de março de 2026.",
              fontname="seri", fontsize=9, color=ON_INKd)
p.insert_text((W - M - 26, H - 22), "04", fontname="san", fontsize=7.5, color=OCRE)

# ═══════════════════════════════════════════════════════════
# P5 — LEITURA DA PRANCHA 01
# ═══════════════════════════════════════════════════════════
p = newpage(INK)
running(p, 5, 11, "Série 01 · Prancha 01")

L = pymupdf.Rect(M, 92, M + CW * 0.44, H - 56)
R0 = M + CW * 0.44 + 44
rule(p, L.x0, 106, 44, OCRE, 0.8)
box(p, pymupdf.Rect(L.x0, 130, L.x1, 300),
    "Antes de saber\nqualquer coisa sobre\neste lugar, observe.", "ser", 30, BONE, lh=1.2)

tracked(p, L.x0, 348, "Perguntas de partida", 6.6, ON_INKd, 0.24)
qy = 368
for i, q in enumerate(["O que você consegue identificar na fotografia?",
                       "Quais elementos da paisagem chamam sua atenção?"], 1):
    r = pymupdf.Rect(L.x0, qy, L.x1, qy + 54)
    p.draw_rect(r, color=(0.29, 0.24, 0.18), width=0.5, fill=BONE, fill_opacity=0.03)
    p.insert_text((r.x0 + 13, r.y0 + 22), f"0{i}", fontname="san", fontsize=7, color=OCRE)
    p.insert_textbox(pymupdf.Rect(r.x0 + 36, r.y0 + 14, r.x1 - 28, r.y1),
                     q, fontname="ser", fontsize=10.4, color=BONE3, lineheight=1.4)
    p.draw_circle(pymupdf.Point(r.x1 - 17, r.y0 + 27), 6.5, color=(0.35, 0.30, 0.24), width=0.6)
    qy += 62

Rr = pymupdf.Rect(R0, 92, W - M, 356)
fit(p, Rr,
    "A fotografia registra uma casa de farinha localizada no município de Guaraciaba do Norte, Ceará. "
    "Espaços como esse estão relacionados à produção da farinha de mandioca e às práticas, técnicas e "
    "relações de trabalho desenvolvidas em torno desse processo. Mais do que uma construção, a casa de "
    "farinha pode ser compreendida como um espaço de produção de experiências, saberes e memórias.\n\n"
    "A fotografia foi registrada pela tarde, em março de 2026. A ideia foi registrar uma imagem ampla "
    "da casa, marcando a sua centralidade naquele espaço. Em gerações anteriores, esse local manifestava "
    "um polo acolhedor de sociabilidades e afetos sociais que carregavam simbologias, ritos e memórias "
    "sociais fundantes de um pertencimento local.",
    "ser", 11.4, BONE3, align=3, lh=1.66)

d = pymupdf.Rect(R0, 392, W - M, H - 56)
p.draw_rect(d, color=OCRE, width=0.6, fill=OCRE, fill_opacity=0.07)
p.draw_line(pymupdf.Point(d.x0, d.y0), pymupdf.Point(d.x0, d.y1), color=OCRE, width=2)
tracked(p, d.x0 + 22, d.y0 + 30, "Desafio", 6.8, OCRE, 0.26)
box(p, pymupdf.Rect(d.x0 + 22, d.y0 + 50, d.x1 - 22, d.y1 - 14),
    "O que uma construção pode nos contar sobre a maneira como uma comunidade vivia e trabalhava?",
    "ser", 19, BONE, lh=1.3)

# ═══════════════════════════════════════════════════════════
# P6 — PRANCHA 02
# ═══════════════════════════════════════════════════════════
p = newpage(INK)
place(p, pymupdf.Rect(0, 0, W, H - 52), IMG / "foto-02.jpg", sat=0.88)
tracked(p, M, H - 22, "Prancha 02", 6.8, OCRE, 0.24)
p.insert_text((M + 88, H - 22), "Fachada frontal — pilar de tijolos aparentes, reboco esfarelado e telhado remendado.",
              fontname="seri", fontsize=9, color=ON_INKd)
p.insert_text((W - M - 26, H - 22), "06", fontname="san", fontsize=7.5, color=OCRE)

# ═══════════════════════════════════════════════════════════
# P7 — MARCAS MATERIAIS + TEMPO DO LUGAR
# ═══════════════════════════════════════════════════════════
p = newpage(BONE)
running(p, 7, 11, "Série 01 · Prancha 02", dark=False)
tracked(p, M, 96, "Prancha 02", 7, OCREDIM, 0.26)
p.insert_text((M - 2, 140), "Observe novamente, por outro ângulo", fontname="ser", fontsize=27, color=ON_BONE)
box(p, pymupdf.Rect(M, 158, M + 520, 200),
    "A construção apresenta marcas materiais que podem provocar perguntas sobre sua trajetória.",
    "seri", 11, ON_BONEd, lh=1.4)

qy = 212
for i, q in enumerate(["Como a casa foi construída?", "Quais materiais aparecem na construção?"], 3):
    r = pymupdf.Rect(M, qy, M + 348, qy + 42)
    p.draw_rect(r, color=(0.72, 0.68, 0.60), width=0.5)
    p.insert_text((r.x0 + 13, r.y0 + 25), f"0{i}", fontname="san", fontsize=7, color=OCREDIM)
    p.insert_text((r.x0 + 36, r.y0 + 26), q, fontname="ser", fontsize=11, color=ON_BONE)
    p.draw_circle(pymupdf.Point(r.x1 - 17, r.y0 + 21), 6.5, color=(0.66, 0.62, 0.55), width=0.6)
    qy += 50

# miniatura de referência à direita
th = pymupdf.Rect(W - M - 240, 200, W - M, 200 + 240 * 0.667)
place(p, th, IMG / "foto-02.jpg", sat=0.84)
tracked(p, th.x0, th.y1 + 16, "Prancha 02 · detalhe da fachada", 6, ON_BONEd, 0.18)

rule(p, M, 336, th.x0 - M - 24, (0.74, 0.70, 0.63), 0.5)
tracked(p, M, 366, "Eixo temporal", 7, OCREDIM, 0.26)
p.insert_text((M - 2, 408), "O Tempo do Lugar", fontname="ser", fontsize=32, color=ON_BONE)
p.insert_text((W - M - 168, 408), "passado · presente · futuro", fontname="seri", fontsize=12, color=ON_BONEd)

cw3 = (CW - 60) / 3
for i, (lbl, qs) in enumerate([
        ("Passado", ["Quem utilizava esse espaço?", "Como era produzido o alimento?",
                     "Quais pessoas participavam desse trabalho?"]),
        ("Presente", ["O espaço continua sendo utilizado?", "Quais mudanças podemos perceber?"]),
        ("Futuro",  ["O que poderá acontecer com esse lugar se deixar de ser utilizado?"])]):
    x = M + i * (cw3 + 30)
    p.draw_line(pymupdf.Point(x, 434), pymupdf.Point(x + cw3, 434), color=OCREDIM, width=1.2)
    tracked(p, x, 456, lbl, 7.6, OCREDIM, 0.22)
    yy = 474
    for q in qs:
        p.insert_text((x, yy + 8), "—", fontname="sanr", fontsize=8, color=(0.70, 0.66, 0.58))
        r = pymupdf.Rect(x + 14, yy, x + cw3, H - 44)
        hgt = used(p, r, q, "ser", 10.2, 1.44)
        p.insert_textbox(pymupdf.Rect(x + 14, yy, x + cw3, yy + hgt + 2),
                         q, fontname="ser", fontsize=10.2, color=ON_BONE2, lineheight=1.44)
        yy += hgt + 9

# ═══════════════════════════════════════════════════════════
# P8 — REFLITA + PROSA
# ═══════════════════════════════════════════════════════════
p = newpage(INK)
running(p, 8, 11, "Série 01 · leitura")
rf = pymupdf.Rect(M, 92, W - M, 216)
p.draw_rect(rf, color=None, fill=INK2)
p.draw_line(pymupdf.Point(rf.x0, rf.y0), pymupdf.Point(rf.x0, rf.y1), color=OCRE, width=2)
tracked(p, rf.x0 + 24, rf.y0 + 30, "Reflita", 6.8, OCRE, 0.26)
box(p, pymupdf.Rect(rf.x0 + 24, rf.y0 + 46, rf.x1 - 24, rf.y1 - 10),
    "Quando uma prática deixa de acontecer em determinado lugar, o que acontece com as memórias relacionadas a ela?",
    "ser", 19, BONE, lh=1.26)

cw2 = (CW - 44) / 2
fit(p, pymupdf.Rect(M, 254, M + cw2, H - 60),
    "Professores, vamos pensar sobre a fotografia: primeiro, ela registra um determinado enquadramento, "
    "em determinado momento, a partir do olhar de quem fotografa. Por isso, observar uma fotografia "
    "historicamente significa perguntar não apenas “o que ela mostra?”, mas também “o que ela não "
    "mostra?”, “quem produziu essa imagem?” e “que histórias podemos investigar a partir dela?”",
    "ser", 11, BONE3, align=3, lh=1.66)
fit(p, pymupdf.Rect(M + cw2 + 44, 254, W - M, H - 60),
    "Uma casa de farinha pode ser entendida como um lugar de memória, não apenas por sua estrutura "
    "física, mas pelas experiências humanas que nela aconteceram. Lugares de memória são elaborações "
    "sociais e culturais que carregam uma experiência temporal — ou seja, a relação do lugar com a "
    "memória é fruto das escolhas e convenções sociais.",
    "ser", 11, BONE3, align=3, lh=1.66)

# ═══════════════════════════════════════════════════════════
# P9 — PRANCHAS 03 & 04
# ═══════════════════════════════════════════════════════════
p = newpage(INK)
running(p, 9, 11, "Série 01 · Pranchas 03 e 04")
gw = (CW - 26) / 2
for i, (f, num, cap) in enumerate([
        ("foto-03.jpg", "Prancha 03", "Cascas de laranja secando sob o madeiramento — o preparo do chá."),
        ("foto-04.jpg", "Prancha 04", "Interior do engenho — tanques, forno e cana-de-açúcar recém-cortada.")]):
    x = M + i * (gw + 26)
    place(p, pymupdf.Rect(x, 92, x + gw, 92 + gw * 0.667), IMG / f, sat=0.88)
    tracked(p, x, 92 + gw * 0.667 + 22, num, 6.6, OCRE, 0.24)
    p.insert_textbox(pymupdf.Rect(x, 92 + gw * 0.667 + 30, x + gw, H - 84),
                     cap, fontname="seri", fontsize=9.2, color=ON_INKd, lineheight=1.45)
rule(p, M, H - 88, 44, OCRE, 0.8)
box(p, pymupdf.Rect(M, H - 76, W - M, H - 30),
    "A fotografia não se configura simplesmente como a fotografia de uma casa de farinha: torna-se um dispositivo para ensinar o aluno a olhar historicamente para um lugar.",
    "seri", 14, BONE, lh=1.3)

# ═══════════════════════════════════════════════════════════
# P10 — TRÊS DIMENSÕES
# ═══════════════════════════════════════════════════════════
p = newpage(BONE)
running(p, 10, 11, "Chave de leitura", dark=False)
tracked(p, M, 96, "§ 02 — Chave de leitura", 7, OCREDIM, 0.26)
p.insert_text((M - 2, 148), "Três dimensões simultâneas", fontname="ser", fontsize=38, color=ON_BONE)
box(p, pymupdf.Rect(M, 168, M + 560, 208),
    "As fotografias da casa de farinha podem ser trabalhadas em três dimensões que operam ao mesmo tempo.",
    "seri", 11, ON_BONEd, lh=1.4)

dims = [("I", "O Espaço", "construção · território · paisagem · materialidade",
         "Observe a arquitetura formada por colunas, característica de uma paisagem comum no meio rural "
         "nordestino. A madeira cerrada denuncia uma mudança da casa ao longo do tempo. A imagem das canas "
         "de açúcar revela que o lugar ainda é usado."),
        ("II", "O Tempo", "permanências · transformações · usos e desusos",
         "Observe que a estrutura resistiu ao longo dos anos, recebendo modificações. Entretanto, o seu "
         "formato original permaneceu."),
        ("III", "A Memória", "trabalho · saberes · experiências · lembranças e esquecimentos",
         "A segunda foto apresenta uma prática comum: as cascas de laranja como chá. Essa prática carrega "
         "uma ancestralidade que conecta o passado histórico brasileiro.")]
cw3 = (CW - 64) / 3
DIM_RECTS = []
REFS = [("foto-04.jpg", "Prancha 04"), ("foto-02.jpg", "Prancha 02"), ("foto-03.jpg", "Prancha 03")]
for i, (n, t, kw, tx) in enumerate(dims):
    x = M + i * (cw3 + 32)
    place(p, pymupdf.Rect(x, 236, x + cw3, 236 + cw3 * 0.42), IMG / REFS[i][0], sat=0.8)
    p.draw_line(pymupdf.Point(x, 236 + cw3 * 0.42 + 22), pymupdf.Point(x + cw3, 236 + cw3 * 0.42 + 22),
                color=ON_BONEd, width=0.8)
    yb = 236 + cw3 * 0.42 + 22
    p.insert_text((x, yb + 26), n, fontname="ser", fontsize=13, color=OCREDIM)
    p.insert_text((x + 26, yb + 27), REFS[i][1], fontname="sanr", fontsize=7, color=ON_BONEd)
    p.insert_text((x, yb + 66), t, fontname="ser", fontsize=26, color=ON_BONE)
    p.insert_textbox(pymupdf.Rect(x, yb + 80, x + cw3, yb + 118), kw.upper(),
                     fontname="sanr", fontsize=7.2, color=ON_BONEd, lineheight=1.7)
    DIM_RECTS.append(pymupdf.Rect(x, yb + 126, x + cw3, H - 52))
fit_all(p, DIM_RECTS, [d[3] for d in dims], "ser", 10.4, ON_BONE2, align=3, lh=1.62)

# ═══════════════════════════════════════════════════════════
# P11 — FECHAMENTO + FICHA TÉCNICA
# ═══════════════════════════════════════════════════════════
p = newpage(INK)
place(p, pymupdf.Rect(0, 0, W, H), IMG / "foto-02.jpg", sat=0.25, dark=0.62,
      scrim=lambda t: 0.62)
tracked(p, M, 118, "Fim da série 01", 7, OCRE, 0.26)
box(p, pymupdf.Rect(M, 142, M + 520, 268),
    "Quando uma prática cessa,\no lugar continua falando.", "ser", 34, BONE, lh=1.18)
rule(p, M, 300, CW, (0.35, 0.30, 0.24), 0.6)

tracked(p, M, 330, "Ficha técnica", 7, OCRE, 0.26)
items = [("Catálogo", "Cartografias do Abandono: memória, esquecimento e fotografia no ensino de História para o Ensino Médio"),
         ("Autoria", "Francisco das Chagas Barroso Uchoa"),
         ("Pesquisa", "Cartografias do Abandono: estudo sobre o esquecimento como objeto para o Ensino de História"),
         ("Programa", "Mestrado Profissional em Ensino de História — ProfHistória"),
         ("Instituição", "Universidade Estadual do Piauí (UESPI) — Campus Alexandre Alves de Oliveira"),
         ("Orientação", "Prof. Dr. Fernando Bagiotto Botton"),
         ("Série 01", "Casas de farinha e engenhos velhos — Guaraciaba do Norte, Ceará. Registros de março de 2026.")]
cwf = (CW - 60) / 3
for i, (k, v) in enumerate(items):
    x = M + (i % 3) * (cwf + 30)
    y = 356 + (i // 3) * 64
    tracked(p, x, y, k, 6.2, OCRE, 0.2)
    p.insert_textbox(pymupdf.Rect(x, y + 8, x + cwf, y + 68), v,
                     fontname="ser", fontsize=9, color=BONE3, lineheight=1.5)
tracked(p, M, H - 20, "Francisco das Chagas Barroso Uchoa · ProfHistória / UESPI — 2026.  Todas as fotografias integram o acervo da pesquisa.",
        6.2, (0.45, 0.41, 0.35), 0.16)

# ── metadados + gravação ────────────────────────────────────
doc.set_metadata({
    "title": "Cartografias do Abandono — memória, esquecimento e fotografia no ensino de História",
    "author": "ProfHistória / UESPI",
    "subject": "Catálogo fotográfico e proposição didática para o Ensino Médio",
    "keywords": "história, memória, esquecimento, patrimônio, fotografia, ensino médio, ProfHistória, UESPI",
    "creator": "Cartografias do Abandono",
})
toc = [[1, "Capa", 1], [1, "Apresentação", 2], [1, "Série 01 — Casas de farinha e engenhos velhos", 3],
       [2, "Prancha 01", 4], [2, "Leitura da Prancha 01", 5], [2, "Prancha 02", 6],
       [2, "O Tempo do Lugar", 7], [2, "Reflita", 8], [2, "Pranchas 03 e 04", 9],
       [1, "Três dimensões simultâneas", 10], [1, "Ficha técnica", 11]]
doc.set_toc(toc)
doc.save(OUT, garbage=4, deflate=True, clean=True)
print(f"OK  {OUT}  —  {doc.page_count} páginas, {OUT.stat().st_size/1024:.0f} KB")
