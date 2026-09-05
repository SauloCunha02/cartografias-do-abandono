# Cartografias do Abandono

Catálogo fotográfico e proposição didática — memória, esquecimento e fotografia no ensino
de História para o Ensino Médio.
Mestrado Profissional em Ensino de História (ProfHistória) — UESPI, Campus Alexandre Alves
de Oliveira. Orientação: Prof. Dr. Fernando Bagiotto Botton.

## Como abrir

Abrir `index.html` direto no navegador **ou** servir pelo XAMPP em
`http://localhost/Barroso/`. O site é 100% estático e funciona **offline** — não há CDN,
biblioteca externa nem requisição de rede.

## Estrutura

```
index.html                      página única do catálogo
Cartografias-do-Abandono.pdf    catálogo completo, 11 páginas A4 paisagem
assets/
  css/fonts.css                 fontes embutidas em base64 (imunes a CORS em file://)
  css/style.css                 sistema visual completo
  css/a11y.css                  painel e classes do módulo de acessibilidade
  js/main.js                    interações (JS puro, sem dependências)
  js/a11y.js                    preferências de acessibilidade
  img/                          fotografias em .jpg + .webp, e o favicon
tools/build_pdf.py              regenera o PDF a partir das mesmas imagens
```

## Paleta

Extraída da fotografia de capa (fachada em ruína), por quantização de cor:

| token | hex | origem na foto |
|---|---|---|
| `--ink` | `#17120D` | fuligem nas paredes |
| `--bone` | `#EDE5D6` | reboco claro |
| `--ocre` | `#C9913F` | pintura amarela descascada |
| `--terra` | `#A9552F` | telha |
| `--sage` | `#7E8C6F` | portas de madeira |

## Tipografia

- **Fraunces** (títulos) — eixos `SOFT 0` / `WONK 1`, que dão o desenho irregular
  adequado ao tema da ruína.
- **Newsreader** (texto corrido e legendas).
- **Archivo** (rótulos em caixa alta, botões e navegação).

Todas variáveis, auto-hospedadas, subset `latin` (cobre todo o português).

## Interações

| recurso | onde |
|---|---|
| Comparador arrastável entre os dois enquadramentos | Prancha 02 |
| Roteiro do professor — 12 perguntas com marcação, anotações e impressão | botão *Roteiro* |
| Visualizador de fotografias com teclado (setas / `Esc`) | qualquer foto |
| Linha do tempo Passado / Presente / Futuro | seção *O Tempo do Lugar* |
| Acordeão das três dimensões, com link para a prancha citada | seção *Dimensões* |

O roteiro é salvo em `localStorage` (fica no navegador do professor, não vai para lugar
nenhum) e é impresso junto com a página via `Ctrl+P`.

## Acessibilidade

Botão de pessoa na barra superior (ou `Alt` + `A`) abre o painel **Como você prefere ler**.
Tudo é salvo em `localStorage` e continua valendo nas próximas visitas.

| grupo | recursos |
|---|---|
| Perfis rápidos | Leitura assistida · Baixa visão · Sensível a movimento · Foco na linha |
| Leitura | Voz alta (pt-BR) · Linha de destaque · Máscara de leitura · Espaçamento (WCAG 1.4.12) · Fonte Atkinson Hyperlegible · 4 tamanhos de texto |
| Cores | Alto contraste · Correção para protanopia, deuteranopia, tritanopia e acromatopsia |
| Movimento | Desativar efeitos · Sublinhar links · Cursor ampliado · Foco reforçado |
| Libras | VLibras (gov.br), carregado sob demanda |

A correção de daltonismo **compensa** as cores (daltonização), em vez de apenas simular
o efeito — simular deixaria pior justamente para quem já é daltônico. As matrizes são
`I + Shift·(I − S)` atenuadas a 65%, aplicadas em cada filho direto de `<body>`: aplicá-las
em `html` ou `body` criaria um containing block e quebraria todo `position: fixed` da página.

Atalhos: `Alt`+`A` painel · `Alt`+`L` leitura em voz alta · `Esc` interrompe ou fecha.

## Robustez

- Navegação completa por teclado; `aria-*` nos componentes interativos.
- `prefers-reduced-motion` desliga parallax, revelações e cursor.
- Sem JavaScript (ou se o script falhar) a página se abre inteira e legível.
- Imagens com miniatura desfocada (LQIP) embutida no CSS, `loading="lazy"` e `.webp`.
- Folha de impressão dedicada.

## Regenerar o PDF

```bash
pip install pymupdf pillow
python tools/build_pdf.py
```

O script usa as fotos de `assets/img/` e as fontes do Windows (Palatino Linotype, com
Georgia e Times como alternativas). Saída: `Cartografias-do-Abandono.pdf`.
