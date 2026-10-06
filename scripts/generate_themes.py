import os

themes_data = {
    'monochrome': {
        'font': 'https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700&display=swap',
        'vars': """  --maxw:1160px;
  --gap:56px;
  --cols:1.15fr .85fr;
  --radius:0;
  --radius-sm:0;
  --radius-xs:0;
  --swatch-radius:0;
  --dot-radius:0;
  --box-bg:transparent;
  --box-border:0;
  --box-pad:0;
  --box-shadow:none;
  --font-btn:var(--font-body);
  --btn-ls:0;
  --btn-tt:none;
  --btn-radius:0;
  --btn-shadow:none;
  --brand-ls:-.01em;
  --brand-w:600;
  --title-w:500;
  --title-size:clamp(28px,3.6vw,40px);
  --title-ls:-.035em;
  --title-tt:none;
  --price-size:28px;
  --price-w:500;
  --price-ink:var(--text);
  --stage-border:0;
  --star:#0d0d0d;
  --low:#b3261e;
  --btn2-bg:transparent;
  --btn2-ink:var(--text);
  --btn2-border:1.5px solid var(--border);
  --ship-bg:var(--surface);
  --ship-border:1px solid var(--border);
  --chip-bg:transparent;
  --chip-on:var(--accent-soft);
  --chip-on-ink:var(--text);
  --off-bg:#0d0d0d;
  --off-ink:#fff;
  --flag-bg:#0d0d0d;
  --flag-ink:var(--accent-ink);
  --toast-bg:var(--text);
  --toast-ink:var(--bg);
  --focus:var(--accent);
  --accent-text:var(--accent);
  --font-display:var(--font-body);
  --font-body:'Schibsted Grotesk',system-ui,sans-serif;
  --bg:#ffffff;
  --surface:#ffffff;
  --text:#0d0d0d;
  --muted:#717171;
  --border:#e4e4e4;
  --accent:#0d0d0d;
  --accent-ink:#ffffff;
  --accent-soft:#f2f2f2;
  --stage:#f5f5f5;
  --shot-1:#d9d9d9;
  --shot-2:#9e9e9e;
  --shot-3:#0d0d0d;""",
        'overrides': """[data-theme="monochrome"] .pd-top{border-bottom-width:1px}
[data-theme="monochrome"] .pd-stage__flag{font-weight:500;letter-spacing:.02em;padding:7px 12px}
[data-theme="monochrome"] .pd-title{max-width:14ch}
[data-theme="monochrome"] .pd-rating{margin-bottom:26px}
[data-theme="monochrome"] .pd-pricing{padding-bottom:14px;border-bottom:1px solid var(--border)}
[data-theme="monochrome"] .pd-taxnote{margin-top:14px}
[data-theme="monochrome"] .pd-ship{padding:18px 0;border-left:0;border-right:0;border-bottom:0;border-top:1px solid var(--border);background:0}
[data-theme="monochrome"] .pd-modes{grid-template-columns:1fr}
[data-theme="monochrome"] .pd-chip{padding:10px 18px}
[data-theme="monochrome"] .pd-btn{min-height:56px;font-weight:600}
[data-theme="monochrome"] .pd-trust{border-top:1px solid var(--border)}
[data-theme="monochrome"] .pd-specs th{font-weight:500}"""
    },
    'blossom-lavender': {
        'font': 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Karla:wght@400;500;700&display=swap',
        'vars': """  --maxw:1200px;
  --gap:44px;
  --cols:1.05fr .95fr;
  --radius:24px;
  --radius-sm:14px;
  --radius-xs:999px;
  --swatch-radius:50%;
  --dot-radius:50%;
  --box-bg:#ffffff;
  --box-border:1px solid var(--border);
  --box-pad:26px;
  --box-shadow:0 18px 50px -26px rgba(96,54,140,.35);
  --font-btn:var(--font-body);
  --btn-ls:0;
  --btn-tt:none;
  --btn-radius:999px;
  --btn-shadow:0 10px 24px -10px rgba(139,98,196,.75);
  --brand-ls:-.01em;
  --brand-w:700;
  --title-w:600;
  --title-size:clamp(26px,3.4vw,36px);
  --title-ls:-.015em;
  --title-tt:none;
  --price-size:30px;
  --price-w:600;
  --price-ink:var(--text);
  --stage-border:1px solid var(--border);
  --star:#d98cb4;
  --low:#b3261e;
  --btn2-bg:transparent;
  --btn2-ink:var(--text);
  --btn2-border:1.5px solid var(--border);
  --ship-bg:#faf5fd;
  --ship-border:1px solid #e9dcf4;
  --chip-bg:transparent;
  --chip-on:var(--accent-soft);
  --chip-on-ink:var(--text);
  --off-bg:var(--accent-soft);
  --off-ink:var(--accent-text);
  --flag-bg:var(--accent);
  --flag-ink:var(--accent-ink);
  --toast-bg:var(--text);
  --toast-ink:var(--bg);
  --focus:var(--accent);
  --accent-text:#6f49aa;
  --font-display:'Fraunces','Iowan Old Style',Georgia,serif;
  --font-body:'Karla',system-ui,sans-serif;
  --bg:#fbf6fb;
  --surface:#ffffff;
  --text:#3a2a41;
  --muted:#83718b;
  --border:#ecdff1;
  --accent:#8b62c4;
  --accent-ink:#ffffff;
  --accent-soft:#f1e7fb;
  --stage:#f6ecf6;
  --shot-1:#e9c2dc;
  --shot-2:#c3aee6;
  --shot-3:#fff1f7;""",
        'overrides': """body[data-theme="blossom-lavender"], [data-theme="blossom-lavender"]{background:radial-gradient(1100px 500px at 78% -8%,#f6e8f6 0%,var(--bg) 62%)}
[data-theme="blossom-lavender"] .pd-top{background:transparent;border-bottom-color:#f0e4f3}
[data-theme="blossom-lavender"] .pd-stage{background:linear-gradient(160deg,#fbeef6 0%,#efe6fb 100%)}
[data-theme="blossom-lavender"] .pd-stage__flag{font-weight:700;background:#fff;color:var(--accent-text);box-shadow:0 6px 16px -8px rgba(96,54,140,.5)}
[data-theme="blossom-lavender"] .pd-chip{border-radius:999px;padding:10px 18px;background:#fff}
[data-theme="blossom-lavender"] .pd-swatch{box-shadow:inset 0 0 0 3px #fff}
[data-theme="blossom-lavender"] .pd-qty,[data-theme="blossom-lavender"] .pd-select,[data-theme="blossom-lavender"] .pd-mode{background:#fff}
[data-theme="blossom-lavender"] .pd-btn--cart{background:#f7f1fc;border-color:transparent}
[data-theme="blossom-lavender"] .pd-tab[aria-selected="true"]{border-bottom-width:3px}
[data-theme="blossom-lavender"] .pd-list li::before{background:linear-gradient(135deg,#e9a8cd,#a483dd)}"""
    },
    'phantom': {
        'font': 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter+Tight:wght@400;500;600&display=swap',
        'vars': """  --maxw:1200px;
  --gap:44px;
  --cols:1.05fr .95fr;
  --radius:12px;
  --radius-sm:9px;
  --radius-xs:4px;
  --swatch-radius:50%;
  --dot-radius:50%;
  --box-bg:#0d1016;
  --box-border:1px solid #1e2431;
  --box-pad:24px;
  --box-shadow:0 30px 70px -40px rgba(47,217,232,.35);
  --font-btn:var(--font-body);
  --btn-ls:0;
  --btn-tt:none;
  --btn-radius:9px;
  --btn-shadow:0 0 0 1px rgba(47,217,232,.5),0 12px 34px -14px rgba(47,217,232,.7);
  --brand-ls:-.01em;
  --brand-w:700;
  --title-w:700;
  --title-size:clamp(26px,3.4vw,36px);
  --title-ls:-.025em;
  --title-tt:none;
  --price-size:30px;
  --price-w:700;
  --price-ink:var(--text);
  --stage-border:1px solid var(--border);
  --star:var(--accent);
  --low:#ff7a6b;
  --btn2-bg:#151a24;
  --btn2-ink:var(--text);
  --btn2-border:1px solid #262d3c;
  --ship-bg:#0a0d13;
  --ship-border:1px solid #1e2431;
  --chip-bg:transparent;
  --chip-on:rgba(47,217,232,.14);
  --chip-on-ink:#8ceaf4;
  --off-bg:rgba(47,217,232,.14);
  --off-ink:#5fe3ef;
  --flag-bg:var(--accent);
  --flag-ink:var(--accent-ink);
  --toast-bg:#151a24;
  --toast-ink:#e9edf5;
  --focus:var(--accent);
  --accent-text:#5fe3ef;
  --font-display:'Space Grotesk',system-ui,sans-serif;
  --font-body:'Inter Tight',system-ui,sans-serif;
  --bg:#08090d;
  --surface:#0e1016;
  --text:#e9edf5;
  --muted:#8c95a8;
  --border:#222836;
  --accent:#2fd9e8;
  --accent-ink:#04161b;
  --accent-soft:rgba(47,217,232,.13);
  --stage:#12151d;
  --shot-1:#1c2230;
  --shot-2:#2fd9e8;
  --shot-3:#39405a;""",
        'overrides': """body[data-theme="phantom"], [data-theme="phantom"]{background:radial-gradient(900px 420px at 12% -6%,rgba(47,217,232,.10),transparent 60%),radial-gradient(700px 400px at 92% 8%,rgba(112,70,220,.12),transparent 60%),var(--bg)}
[data-theme="phantom"] .pd-top{background:rgba(10,12,18,.8);backdrop-filter:blur(8px)}
[data-theme="phantom"] .pd-stage{border-color:#1e2431}
[data-theme="phantom"] .pd-stage__flag{background:rgba(47,217,232,.14);color:var(--accent-text);border:1px solid rgba(47,217,232,.35);backdrop-filter:blur(6px)}
[data-theme="phantom"] .pd-price{text-shadow:0 0 26px rgba(47,217,232,.28)}
[data-theme="phantom"] .pd-thumb{border-color:#1e2431}
[data-theme="phantom"] .pd-btn--cart:hover{background:#1b2230}
[data-theme="phantom"] .pd-btn--call{border-color:#262d3c}
[data-theme="phantom"] .pd-stickybar{background:#0d1016}
[data-theme="phantom"] .pd-mode:has(input:checked){box-shadow:inset 0 0 0 1px rgba(47,217,232,.4)}
[data-theme="phantom"] .pd-list li::before{box-shadow:0 0 10px var(--accent)}"""
    },
    'playful-pumpkin': {
        'font': 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700&display=swap',
        'vars': """  --maxw:1200px;
  --gap:44px;
  --cols:1.05fr .95fr;
  --radius:22px;
  --radius-sm:14px;
  --radius-xs:999px;
  --swatch-radius:50%;
  --dot-radius:50%;
  --box-bg:#ffffff;
  --box-border:3px solid #34241a;
  --box-pad:24px;
  --box-shadow:8px 8px 0 #ffd9ae;
  --font-btn:'Fredoka',system-ui,sans-serif;
  --btn-ls:0;
  --btn-tt:none;
  --btn-radius:999px;
  --btn-shadow:0 6px 0 #c95f0c;
  --brand-ls:-.01em;
  --brand-w:700;
  --title-w:600;
  --title-size:clamp(26px,3.4vw,36px);
  --title-ls:-.01em;
  --title-tt:none;
  --price-size:32px;
  --price-w:700;
  --price-ink:var(--text);
  --stage-border:1px solid var(--border);
  --star:#f5a623;
  --low:#b3261e;
  --btn2-bg:transparent;
  --btn2-ink:var(--text);
  --btn2-border:1.5px solid var(--border);
  --ship-bg:#fffaf3;
  --ship-border:2px dashed #f0bd86;
  --chip-bg:transparent;
  --chip-on:var(--accent-soft);
  --chip-on-ink:var(--text);
  --off-bg:var(--accent-soft);
  --off-ink:var(--accent-text);
  --flag-bg:var(--accent);
  --flag-ink:var(--accent-ink);
  --toast-bg:var(--text);
  --toast-ink:var(--bg);
  --focus:var(--accent);
  --accent-text:#c95f0c;
  --font-display:'Fredoka',system-ui,sans-serif;
  --font-body:'Nunito',system-ui,sans-serif;
  --bg:#fff8ef;
  --surface:#ffffff;
  --text:#34241a;
  --muted:#8b7261;
  --border:#f3d9bd;
  --accent:#ef7b1c;
  --accent-ink:#ffffff;
  --accent-soft:#ffeeda;
  --stage:#fff0dd;
  --shot-1:#ffc073;
  --shot-2:#ef7b1c;
  --shot-3:#4fb3a3;""",
        'overrides': """[data-theme="playful-pumpkin"] .pd-top{background:#ef7b1c;border-bottom:3px solid #34241a}
[data-theme="playful-pumpkin"] .pd-top__in{color:#fff}
[data-theme="playful-pumpkin"] .pd-top__note{color:#ffe7cd}
[data-theme="playful-pumpkin"] .pd-stage{border:3px solid #34241a}
[data-theme="playful-pumpkin"] .pd-stage__flag{transform:rotate(-4deg);border:2px solid #34241a;font-family:'Fredoka',sans-serif;border-radius:999px;box-shadow:3px 3px 0 #34241a}
[data-theme="playful-pumpkin"] .pd-thumb{border-width:3px;border-color:#34241a}
[data-theme="playful-pumpkin"] .pd-chip{border-width:2px;border-color:#34241a;border-radius:999px;padding:9px 18px;background:#fff;font-weight:600}
[data-theme="playful-pumpkin"] .pd-swatch{border-width:3px;border-color:#34241a}
[data-theme="playful-pumpkin"] .pd-qty{border-width:2px;border-color:#34241a}
[data-theme="playful-pumpkin"] .pd-select,[data-theme="playful-pumpkin"] .pd-mode{border-width:2px;border-color:#e7c49b}
[data-theme="playful-pumpkin"] .pd-btn--buy:active{transform:translateY(4px);box-shadow:0 2px 0 #c95f0c}
[data-theme="playful-pumpkin"] .pd-btn--cart{border-width:2px;border-color:#34241a;background:#ffe6c9}
[data-theme="playful-pumpkin"] .pd-tab[aria-selected="true"]{border-bottom-width:4px}
[data-theme="playful-pumpkin"] .pd-stickybar{border-top:3px solid #34241a}"""
    },
    'crimson': {
        'font': 'https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@400;500;600;700&display=swap',
        'vars': """  --maxw:1200px;
  --gap:44px;
  --cols:1.05fr .95fr;
  --radius:3px;
  --radius-sm:3px;
  --radius-xs:2px;
  --swatch-radius:3px;
  --dot-radius:0;
  --box-bg:transparent;
  --box-border:0;
  --box-pad:0 0 0 22px;
  --box-shadow:none;
  --font-btn:'Barlow',sans-serif;
  --btn-ls:.04em;
  --btn-tt:uppercase;
  --btn-radius:2px;
  --btn-shadow:none;
  --brand-ls:.04em;
  --brand-w:400;
  --title-w:400;
  --title-size:clamp(30px,4vw,44px);
  --title-ls:.005em;
  --title-tt:uppercase;
  --price-size:34px;
  --price-w:400;
  --price-ink:var(--text);
  --stage-border:1px solid var(--border);
  --star:#9c1220;
  --low:#b3261e;
  --btn2-bg:transparent;
  --btn2-ink:var(--text);
  --btn2-border:1.5px solid var(--border);
  --ship-bg:#ffffff;
  --ship-border:1px solid var(--border);
  --chip-bg:transparent;
  --chip-on:var(--accent-soft);
  --chip-on-ink:var(--text);
  --off-bg:#9c1220;
  --off-ink:#fff;
  --flag-bg:var(--accent);
  --flag-ink:var(--accent-ink);
  --toast-bg:var(--text);
  --toast-ink:var(--bg);
  --focus:var(--accent);
  --accent-text:#9c1220;
  --font-display:'Anton',Impact,sans-serif;
  --font-body:'Barlow',system-ui,sans-serif;
  --bg:#faf7f6;
  --surface:#ffffff;
  --text:#181111;
  --muted:#786868;
  --border:#e4d9d8;
  --accent:#9c1220;
  --accent-ink:#ffffff;
  --accent-soft:#f8e7e8;
  --stage:#efe7e6;
  --shot-1:#9c1220;
  --shot-2:#2a1a1a;
  --shot-3:#d9c6c3;""",
        'overrides': """[data-theme="crimson"] .pd-brand{font-family:'Anton',sans-serif;letter-spacing:.06em}
[data-theme="crimson"] .pd-buybox{border-left:3px solid var(--accent)}
@media (max-width:979px){[data-theme="crimson"] .pd-buybox{padding-left:16px}}
[data-theme="crimson"] .pd-title{line-height:.98}
[data-theme="crimson"] .pd-stage{border:0}
[data-theme="crimson"] .pd-stage__flag{border-radius:0;letter-spacing:.06em;text-transform:uppercase;font-weight:700}
[data-theme="crimson"] .pd-thumb{border-radius:0}
[data-theme="crimson"] .pd-chip{border-radius:2px;font-weight:600;letter-spacing:.02em}
[data-theme="crimson"] .pd-btn{font-weight:700}
[data-theme="crimson"] .pd-btn--cart{border-width:2px;border-color:var(--text)}
[data-theme="crimson"] .pd-tabs{border-bottom-width:2px}
[data-theme="crimson"] .pd-tab{letter-spacing:.02em}
[data-theme="crimson"] .pd-tab[aria-selected="true"]{border-bottom-width:3px}
[data-theme="crimson"] .pd-specs th{text-transform:uppercase;font-size:12.5px;letter-spacing:.04em}"""
    },
    'natural': {
        'font': 'https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Work+Sans:wght@400;500;600&display=swap',
        'vars': """  --maxw:1200px;
  --gap:44px;
  --cols:1.05fr .95fr;
  --radius:10px;
  --radius-sm:8px;
  --radius-xs:4px;
  --swatch-radius:50%;
  --dot-radius:50%;
  --box-bg:#fffdf7;
  --box-border:1px solid #e3dfcd;
  --box-pad:26px;
  --box-shadow:none;
  --font-btn:var(--font-body);
  --btn-ls:0;
  --btn-tt:none;
  --btn-radius:8px;
  --btn-shadow:none;
  --brand-ls:-.01em;
  --brand-w:500;
  --title-w:500;
  --title-size:clamp(28px,3.6vw,40px);
  --title-ls:-.01em;
  --title-tt:none;
  --price-size:31px;
  --price-w:500;
  --price-ink:var(--text);
  --stage-border:1px solid var(--border);
  --star:#9a7b2e;
  --low:#b3261e;
  --btn2-bg:transparent;
  --btn2-ink:var(--text);
  --btn2-border:1.5px solid var(--border);
  --ship-bg:#f4f2e6;
  --ship-border:1px solid #ddd9c8;
  --chip-bg:transparent;
  --chip-on:var(--accent-soft);
  --chip-on-ink:var(--text);
  --off-bg:var(--accent-soft);
  --off-ink:var(--accent-text);
  --flag-bg:var(--accent);
  --flag-ink:var(--accent-ink);
  --toast-bg:var(--text);
  --toast-ink:var(--bg);
  --focus:var(--accent);
  --accent-text:#3d5629;
  --font-display:'Newsreader',Georgia,serif;
  --font-body:'Work Sans',system-ui,sans-serif;
  --bg:#f7f5ee;
  --surface:#fffdf7;
  --text:#232a1e;
  --muted:#6d7362;
  --border:#ddd9c8;
  --accent:#4e6b39;
  --accent-ink:#fbfdf7;
  --accent-soft:#e7eeda;
  --stage:#ebe8d9;
  --shot-1:#9aa877;
  --shot-2:#4e6b39;
  --shot-3:#cfc7ab;""",
        'overrides': """[data-theme="natural"] .pd-brand{font-family:'Newsreader',serif;font-size:21px;letter-spacing:0}
[data-theme="natural"] .pd-stage{border-radius:120px 12px 120px 12px;background:linear-gradient(170deg,#eeecdd,#e3e2cf)}
[data-theme="natural"] .pd-stage__flag{background:#fffdf7;color:var(--accent-text);border:1px solid #d7d2bb;border-radius:999px;font-weight:600}
[data-theme="natural"] .pd-thumb{border-radius:14px 4px 14px 4px}
[data-theme="natural"] .pd-buybox{border-radius:12px}
[data-theme="natural"] .pd-chip{background:#fffdf7}
[data-theme="natural"] .pd-title{max-width:16ch}
[data-theme="natural"] .pd-panel p{line-height:1.72}
[data-theme="natural"] .pd-btn--cart{background:#f0eee0;border-color:#ddd9c8}
[data-theme="natural"] .pd-trust svg{color:var(--accent)}
[data-theme="natural"] .pd-list li::before{border-radius:50% 50% 50% 0;transform:rotate(-45deg)}"""
    },
    'energetic': {
        'font': 'https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,85..125,400..900;1,85..125,700&display=swap',
        'vars': """  --maxw:1200px;
  --gap:44px;
  --cols:1.05fr .95fr;
  --radius:16px;
  --radius-sm:10px;
  --radius-xs:999px;
  --swatch-radius:50%;
  --dot-radius:50%;
  --box-bg:#ffffff;
  --box-border:1px solid #e2e4ec;
  --box-pad:24px;
  --box-shadow:0 26px 60px -34px rgba(15,17,22,.4);
  --font-btn:'Archivo',sans-serif;
  --btn-ls:-.01em;
  --btn-tt:none;
  --btn-radius:999px;
  --btn-shadow:none;
  --brand-ls:-.04em;
  --brand-w:900;
  --title-w:800;
  --title-size:clamp(30px,4vw,44px);
  --title-ls:-.035em;
  --title-tt:none;
  --price-size:34px;
  --price-w:800;
  --price-ink:var(--text);
  --stage-border:1px solid var(--border);
  --star:#0f1116;
  --low:#b3261e;
  --btn2-bg:transparent;
  --btn2-ink:var(--text);
  --btn2-border:1.5px solid var(--border);
  --ship-bg:#f7f8fb;
  --ship-border:1px solid #e2e4ec;
  --chip-bg:transparent;
  --chip-on:var(--accent-soft);
  --chip-on-ink:var(--text);
  --off-bg:#c4ff2e;
  --off-ink:#12141a;
  --flag-bg:var(--accent);
  --flag-ink:var(--accent-ink);
  --toast-bg:var(--text);
  --toast-ink:var(--bg);
  --focus:var(--accent);
  --accent-text:#2438c9;
  --font-display:var(--font-body);
  --font-body:'Archivo',system-ui,sans-serif;
  --bg:#f2f3f6;
  --surface:#ffffff;
  --text:#0f1116;
  --muted:#6a6f7d;
  --border:#dcdee6;
  --accent:#2f4dff;
  --accent-ink:#ffffff;
  --accent-soft:#e6e9ff;
  --stage:#e9ebf2;
  --shot-1:#2f4dff;
  --shot-2:#c4ff2e;
  --shot-3:#12141a;""",
        'overrides': """[data-theme="energetic"] .pd-brand{font-stretch:112%;font-style:italic}
[data-theme="energetic"] .pd-title{font-stretch:108%}
[data-theme="energetic"] .pd-stage{background:repeating-linear-gradient(115deg,#e6e8f0 0 22px,#eceef4 22px 44px)}
[data-theme="energetic"] .pd-stage__flag{background:#c4ff2e;color:#12141a;font-weight:800;font-stretch:110%;transform:skewX(-9deg);border-radius:3px}
[data-theme="energetic"] .pd-price{font-stretch:108%}
[data-theme="energetic"] .pd-btn--buy{background:#c4ff2e;color:#11131a;box-shadow:0 12px 26px -12px rgba(196,255,46,.9)}
[data-theme="energetic"] .pd-btn--buy:hover{background:#d2ff5c}
[data-theme="energetic"] .pd-btn{font-weight:700;font-stretch:104%}
[data-theme="energetic"] .pd-btn--cart{background:#12141a;color:#fff;border:0}
[data-theme="energetic"] .pd-btn--cart:hover{background:#262a36}
[data-theme="energetic"] .pd-chip{background:#fff;font-weight:600}
[data-theme="energetic"] .pd-chip[aria-pressed="true"]{background:#12141a;color:#fff;border-color:#12141a}
[data-theme="energetic"] .pd-tab[aria-selected="true"]{border-bottom-width:3px}
[data-theme="energetic"] .pd-sum__total{font-stretch:106%}"""
    },
    'tuareg-indigo': {
        'font': 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700&display=swap',
        'vars': """  --maxw:1200px;
  --gap:44px;
  --cols:1.05fr .95fr;
  --radius:6px;
  --radius-sm:5px;
  --radius-xs:3px;
  --swatch-radius:3px;
  --dot-radius:0;
  --box-bg:#fffcf4;
  --box-border:1px solid #dfd3ba;
  --box-pad:26px;
  --box-shadow:none;
  --font-btn:var(--font-body);
  --btn-ls:0;
  --btn-tt:none;
  --btn-radius:5px;
  --btn-shadow:none;
  --brand-ls:.02em;
  --brand-w:700;
  --title-w:700;
  --title-size:clamp(29px,3.8vw,42px);
  --title-ls:-.005em;
  --title-tt:none;
  --price-size:32px;
  --price-w:700;
  --price-ink:var(--text);
  --stage-border:1px solid var(--border);
  --star:#c8a24a;
  --low:#b3261e;
  --btn2-bg:transparent;
  --btn2-ink:var(--text);
  --btn2-border:1.5px solid var(--border);
  --ship-bg:#f7f1e2;
  --ship-border:1px solid #ddd0b5;
  --chip-bg:transparent;
  --chip-on:var(--accent-soft);
  --chip-on-ink:var(--text);
  --off-bg:#2c3b7d;
  --off-ink:#f7f2e6;
  --flag-bg:var(--accent);
  --flag-ink:var(--accent-ink);
  --toast-bg:var(--text);
  --toast-ink:var(--bg);
  --focus:var(--accent);
  --accent-text:#2c3b7d;
  --font-display:'Amiri',Georgia,serif;
  --font-body:'Cairo',system-ui,sans-serif;
  --bg:#f6f1e5;
  --surface:#fffcf4;
  --text:#1e2350;
  --muted:#71705f;
  --border:#ded2ba;
  --accent:#2c3b7d;
  --accent-ink:#f7f2e6;
  --accent-soft:#e3e5f1;
  --stage:#eadfc7;
  --shot-1:#2c3b7d;
  --shot-2:#c8a24a;
  --shot-3:#f3ead6;""",
        'overrides': """[data-theme="tuareg-indigo"] .pd-brand{font-family:'Amiri',serif;font-size:22px}
[data-theme="tuareg-indigo"] .pd-top{background:#2c3b7d;border-bottom:0}
[data-theme="tuareg-indigo"] .pd-top .pd-brand{color:#f3ead6}
[data-theme="tuareg-indigo"] .pd-top__note{color:#c3c8e2}
[data-theme="tuareg-indigo"] .pd-buybox{position:relative}
[data-theme="tuareg-indigo"] .pd-buybox::before{content:"";position:absolute;inset:0 0 auto;height:4px;border-radius:6px 6px 0 0;background:repeating-linear-gradient(90deg,#2c3b7d 0 10px,#c8a24a 10px 14px)}
[data-theme="tuareg-indigo"] .pd-stage{background:linear-gradient(180deg,#efe4cc,#e4d7bb)}
[data-theme="tuareg-indigo"] .pd-stage__flag{background:#fffcf4;color:#2c3b7d;border:1px solid #ded2ba;border-radius:2px;letter-spacing:.02em}
[data-theme="tuareg-indigo"] .pd-ship{background-image:repeating-linear-gradient(45deg,rgba(44,59,125,.04) 0 6px,transparent 6px 12px)}
[data-theme="tuareg-indigo"] .pd-chip{background:#fffcf4;border-radius:3px}
[data-theme="tuareg-indigo"] .pd-btn--cart{background:#f1e9d6;border-color:#ded2ba}
[data-theme="tuareg-indigo"] .pd-title{max-width:15ch}
[data-theme="tuareg-indigo"] .pd-tab[aria-selected="true"]{border-bottom-color:#c8a24a;border-bottom-width:3px}
[data-theme="tuareg-indigo"] .pd-list li::before{transform:rotate(45deg);border-radius:0}"""
    },
    'neo-brutalist': {
        'font': 'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@400;500;700&display=swap',
        'vars': """  --maxw:1200px;
  --gap:44px;
  --cols:1.05fr .95fr;
  --radius:0;
  --radius-sm:0;
  --radius-xs:0;
  --swatch-radius:0;
  --dot-radius:0;
  --box-bg:#ffffff;
  --box-border:3px solid #000;
  --box-pad:22px;
  --box-shadow:10px 10px 0 #000;
  --font-btn:'DM Sans',sans-serif;
  --btn-ls:0;
  --btn-tt:none;
  --btn-radius:0;
  --btn-shadow:5px 5px 0 #000;
  --brand-ls:-.06em;
  --brand-w:700;
  --title-w:700;
  --title-size:clamp(30px,4vw,44px);
  --title-ls:-.045em;
  --title-tt:none;
  --price-size:34px;
  --price-w:700;
  --price-ink:var(--text);
  --stage-border:1px solid var(--border);
  --star:#000;
  --low:#b3261e;
  --btn2-bg:#fff;
  --btn2-ink:var(--text);
  --btn2-border:3px solid #000;
  --ship-bg:#fff8c9;
  --ship-border:3px solid #000;
  --chip-bg:transparent;
  --chip-on:var(--accent-soft);
  --chip-on-ink:var(--text);
  --off-bg:#ff5c35;
  --off-ink:#fff;
  --flag-bg:var(--accent);
  --flag-ink:var(--accent-ink);
  --toast-bg:#ffd400;
  --toast-ink:#000;
  --focus:var(--accent);
  --accent-text:#000000;
  --font-display:'Space Mono',ui-monospace,monospace;
  --font-body:'DM Sans',system-ui,sans-serif;
  --bg:#fffdf0;
  --surface:#fffdf0;
  --text:#000000;
  --muted:#4d4d45;
  --border:#000000;
  --accent:#ffd400;
  --accent-ink:#000000;
  --accent-soft:#fff0a8;
  --stage:#f0ece0;
  --shot-1:#ffd400;
  --shot-2:#000000;
  --shot-3:#ff5c35;""",
        'overrides': """[data-theme="neo-brutalist"] .pd-top{border-bottom:3px solid #000;background:#ffd400}
[data-theme="neo-brutalist"] .pd-brand{font-family:'Space Mono',monospace}
[data-theme="neo-brutalist"] .pd-stage{border:3px solid #000;box-shadow:10px 10px 0 #000}
[data-theme="neo-brutalist"] .pd-stage__flag{border:3px solid #000;font-family:'Space Mono',monospace;background:#fff;color:#000}
[data-theme="neo-brutalist"] .pd-thumb{border-width:3px}
[data-theme="neo-brutalist"] .pd-thumb[aria-current="true"]{box-shadow:4px 4px 0 #000}
[data-theme="neo-brutalist"] .pd-chip{border-width:2px;border-color:#000;background:#fff;font-weight:700}
[data-theme="neo-brutalist"] .pd-chip[aria-pressed="true"]{background:#ffd400;box-shadow:3px 3px 0 #000}
[data-theme="neo-brutalist"] .pd-swatch{border-width:3px}
[data-theme="neo-brutalist"] .pd-qty{border-width:2px;border-color:#000}
[data-theme="neo-brutalist"] .pd-select,[data-theme="neo-brutalist"] .pd-mode{border-width:2px;border-color:#000;background:#fff}
[data-theme="neo-brutalist"] .pd-btn{font-weight:700;border:3px solid #000}
[data-theme="neo-brutalist"] .pd-btn--buy:hover{filter:none;background:#ffe14d}
[data-theme="neo-brutalist"] .pd-btn--buy:active{transform:translate(3px,3px);box-shadow:2px 2px 0 #000}
[data-theme="neo-brutalist"] .pd-btn--call{border:3px dashed #000}
[data-theme="neo-brutalist"] .pd-sum__total{font-family:'Space Mono',monospace}
[data-theme="neo-brutalist"] .pd-tabs{border-bottom:3px solid #000}
[data-theme="neo-brutalist"] .pd-tab[aria-selected="true"]{border-bottom-width:5px;border-bottom-color:#000}
[data-theme="neo-brutalist"] .pd-specs th,[data-theme="neo-brutalist"] .pd-specs td{border-bottom:2px solid #000}
[data-theme="neo-brutalist"] .pd-stickybar{border-top:3px solid #000}
[data-theme="neo-brutalist"] .pd-toast{border:3px solid #000;box-shadow:6px 6px 0 #000}"""
    },
    'luxe-noir': {
        'font': 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Jost:wght@300;400;500&display=swap',
        'vars': """  --maxw:1140px;
  --gap:60px;
  --cols:1.1fr .9fr;
  --radius:2px;
  --radius-sm:2px;
  --radius-xs:2px;
  --swatch-radius:50%;
  --dot-radius:50%;
  --box-bg:transparent;
  --box-border:0;
  --box-pad:0;
  --box-shadow:none;
  --font-btn:var(--font-body);
  --btn-ls:.08em;
  --btn-tt:uppercase;
  --btn-radius:2px;
  --btn-shadow:none;
  --brand-ls:.22em;
  --brand-w:400;
  --title-w:400;
  --title-size:clamp(32px,4.4vw,50px);
  --title-ls:-.005em;
  --title-tt:none;
  --price-size:36px;
  --price-w:400;
  --price-ink:var(--text);
  --stage-border:1px solid var(--border);
  --star:#c6a76a;
  --low:#d98a72;
  --btn2-bg:transparent;
  --btn2-ink:var(--text);
  --btn2-border:1px solid #3a352d;
  --ship-bg:#0f0f11;
  --ship-border:1px solid #262320;
  --chip-bg:transparent;
  --chip-on:var(--accent-soft);
  --chip-on-ink:var(--text);
  --off-bg:rgba(198,167,106,.16);
  --off-ink:#d6bb85;
  --flag-bg:var(--accent);
  --flag-ink:var(--accent-ink);
  --toast-bg:#1a1815;
  --toast-ink:#eae5dc;
  --focus:var(--accent);
  --accent-text:#d6bb85;
  --font-display:'Cormorant Garamond',Garamond,serif;
  --font-body:'Jost',system-ui,sans-serif;
  --bg:#0b0b0c;
  --surface:#0f0f11;
  --text:#eae5dc;
  --muted:#948d82;
  --border:#2a2722;
  --accent:#c6a76a;
  --accent-ink:#14110b;
  --accent-soft:rgba(198,167,106,.14);
  --stage:#141416;
  --shot-1:#1d1d20;
  --shot-2:#c6a76a;
  --shot-3:#2c2a26;""",
        'overrides': """[data-theme="luxe-noir"] .pd-brand{font-size:15px;text-transform:uppercase}
[data-theme="luxe-noir"] .pd-top{background:transparent;border-bottom-color:#211f1b}
[data-theme="luxe-noir"] .pd-price,[data-theme="luxe-noir"] .pd-title{font-family:var(--font-display)}
[data-theme="luxe-noir"] .pd-stage{background:radial-gradient(70% 70% at 50% 40%,#1b1b1e,#0f0f11)}
[data-theme="luxe-noir"] .pd-stage__flag{background:transparent;border:1px solid #3a352d;color:var(--accent-text);font-weight:400;letter-spacing:.14em;text-transform:uppercase;font-size:10.5px}
[data-theme="luxe-noir"] .pd-pricing{padding-bottom:16px;border-bottom:1px solid #211f1b}
[data-theme="luxe-noir"] .pd-title{margin-bottom:14px}
[data-theme="luxe-noir"] .pd-rating{margin-bottom:24px}
[data-theme="luxe-noir"] .pd-chip{background:transparent;border-color:#3a352d;letter-spacing:.04em}
[data-theme="luxe-noir"] .pd-btn{font-size:13px}
[data-theme="luxe-noir"] .pd-btn--buy{font-weight:500}
[data-theme="luxe-noir"] .pd-btn--cart:hover{background:rgba(198,167,106,.1)}
[data-theme="luxe-noir"] .pd-ship{padding:18px 0;border:0;border-top:1px solid #211f1b;background:0}
[data-theme="luxe-noir"] .pd-modes{grid-template-columns:1fr}
[data-theme="luxe-noir"] .pd-mode{background:transparent;border-color:#2a2722}
[data-theme="luxe-noir"] .pd-select{background:#141416;border-color:#2a2722}
[data-theme="luxe-noir"] .pd-qty{background:transparent;border-color:#2a2722}
[data-theme="luxe-noir"] .pd-sum__total{font-family:var(--font-display);font-size:20px}
[data-theme="luxe-noir"] .pd-tab{letter-spacing:.06em;font-weight:400;text-transform:uppercase;font-size:12.5px}
[data-theme="luxe-noir"] .pd-panel p{line-height:1.8}
[data-theme="luxe-noir"] .pd-stickybar{background:#0f0f11}"""
    }
}

base_css = """/* ---------- Shared Product Page Base Styles ---------- */
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--font-body);
  font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}
img,svg{max-width:100%;display:block}
button,input,select{font:inherit;color:inherit}
a{color:inherit}
:focus-visible{outline:2px solid var(--focus);outline-offset:3px}

/* ---------- shell ---------- */
.pd-shell{max-width:var(--maxw);margin:0 auto;padding:0 20px}
.pd-top{border-bottom:1px solid var(--border);background:var(--surface)}
.pd-top__in{max-width:var(--maxw);margin:0 auto;padding:14px 20px;display:flex;
  align-items:center;justify-content:space-between;gap:16px}
.pd-brand{font-family:var(--font-display);font-size:19px;letter-spacing:var(--brand-ls);
  font-weight:var(--brand-w);text-decoration:none}
.pd-top__note{font-size:13px;color:var(--muted)}
.pd-crumbs{font-size:13px;color:var(--muted);padding:18px 0 0}
.pd-crumbs a{text-decoration:none}
.pd-crumbs a:hover{text-decoration:underline}

.pd-product{display:grid;gap:var(--gap);padding:26px 0 54px;align-items:start}
@media (min-width:980px){.pd-product{grid-template-columns:var(--cols)}}

/* ---------- gallery ---------- */
.pd-gallery{display:grid;gap:12px}
.pd-stage{position:relative;background:var(--stage);border-radius:var(--radius);
  overflow:hidden;border:var(--stage-border);aspect-ratio:1/1;display:grid;place-items:center}
.pd-stage img{width:100%;height:100%;object-fit:cover}
.pd-stage svg{width:100%;height:100%}
.pd-stage__flag{position:absolute;top:14px;left:14px;background:var(--flag-bg);color:var(--flag-ink);
  font-size:12px;font-weight:700;padding:6px 11px;border-radius:var(--radius-xs);letter-spacing:.01em}
.pd-thumbs{display:flex;gap:10px;list-style:none;margin:0;padding:0;flex-wrap:wrap}
.pd-thumb{width:70px;height:70px;border-radius:var(--radius-sm);border:2px solid var(--border);
  background:var(--stage);padding:0;cursor:pointer;overflow:hidden;transition:border-color .16s}
.pd-thumb img{width:100%;height:100%;object-fit:cover}
.pd-thumb svg{width:100%;height:100%}
.pd-thumb[aria-current="true"]{border-color:var(--accent)}

/* ---------- buy box ---------- */
.pd-buybox{background:var(--box-bg);border:var(--box-border);border-radius:var(--radius);
  padding:var(--box-pad);box-shadow:var(--box-shadow)}
@media (min-width:980px){.pd-buybox{position:sticky;top:20px}}
.pd-vendor{margin:0 0 6px;font-size:13px;color:var(--muted)}
.pd-title{font-family:var(--font-display);font-weight:var(--title-w);font-size:var(--title-size);
  line-height:1.12;letter-spacing:var(--title-ls);margin:0 0 10px;text-transform:var(--title-tt)}
.pd-rating{display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--muted);margin-bottom:18px}
.pd-stars{color:var(--star);letter-spacing:2px}
.pd-pricing{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:6px}
.pd-price{font-family:var(--font-display);font-size:var(--price-size);font-weight:var(--price-w);
  letter-spacing:var(--title-ls);color:var(--price-ink)}
.pd-was{color:var(--muted);text-decoration:line-through;font-size:16px}
.pd-off{background:var(--off-bg);color:var(--off-ink);font-size:12.5px;font-weight:700;
  padding:4px 9px;border-radius:var(--radius-xs)}
.pd-taxnote{font-size:13px;color:var(--muted);margin:0 0 20px}

.pd-field{margin-bottom:18px}
.pd-label{display:flex;justify-content:space-between;align-items:baseline;gap:10px;
  font-size:13.5px;font-weight:600;margin-bottom:9px}
.pd-label span{font-weight:400;color:var(--muted)}
.pd-opts{display:flex;gap:9px;flex-wrap:wrap}
.pd-chip{border:1.5px solid var(--border);background:var(--chip-bg);border-radius:var(--radius-sm);
  padding:9px 15px;cursor:pointer;font-size:14px;transition:.16s}
.pd-chip[aria-pressed="true"]{border-color:var(--accent);background:var(--chip-on);color:var(--chip-on-ink)}
.pd-chip:disabled{opacity:.38;cursor:not-allowed;text-decoration:line-through}
.pd-swatch{width:38px;height:38px;border-radius:var(--swatch-radius);border:2px solid var(--border);
  cursor:pointer;padding:0;position:relative}
.pd-swatch[aria-pressed="true"]{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}

.pd-qtyrow{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.pd-qty{display:inline-flex;align-items:center;border:1.5px solid var(--border);
  border-radius:var(--radius-sm);overflow:hidden;background:var(--chip-bg)}
.pd-qty button{width:42px;height:44px;border:0;background:transparent;cursor:pointer;font-size:18px}
.pd-qty button:hover{background:var(--accent-soft)}
.pd-qty input{width:48px;height:44px;border:0;background:transparent;text-align:center;
  font-weight:600;-moz-appearance:textfield}
.pd-qty input::-webkit-outer-spin-button,.pd-qty input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.pd-stock{font-size:13px;color:var(--muted)}
.pd-stock b{color:var(--low)}

/* delivery block: cash-on-delivery selling */
.pd-ship{border:var(--ship-border);background:var(--ship-bg);border-radius:var(--radius-sm);
  padding:15px;margin-bottom:18px}
.pd-ship__head{display:flex;align-items:center;gap:9px;font-size:14px;font-weight:700;margin-bottom:12px}
.pd-ship__head svg{width:18px;height:18px;flex:none;color:var(--accent)}
.pd-select{width:100%;height:46px;padding:0 12px;border:1.5px solid var(--border);
  border-radius:var(--radius-sm);background:var(--chip-bg);cursor:pointer}
.pd-modes{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px}
.pd-mode{display:flex;gap:9px;align-items:flex-start;border:1.5px solid var(--border);
  border-radius:var(--radius-sm);padding:10px 11px;cursor:pointer;background:var(--chip-bg);font-size:13.5px}
.pd-mode input{margin:2px 0 0;accent-color:var(--accent)}
.pd-mode:has(input:checked){border-color:var(--accent);background:var(--chip-on);color:var(--chip-on-ink)}
.pd-mode small{display:block;color:var(--muted);font-size:12px}
.pd-mode:has(input:checked) small{color:inherit;opacity:.75}

.pd-sum{list-style:none;margin:14px 0 0;padding:13px 0 0;border-top:1px solid var(--border);
  display:grid;gap:7px;font-size:14px}
.pd-sum li{display:flex;justify-content:space-between;gap:12px}
.pd-sum li span:first-child{color:var(--muted)}
.pd-sum .pd-sum__total{font-weight:700;font-size:17px;padding-top:7px;border-top:1px dashed var(--border)}
.pd-sum .pd-sum__total span:first-child{color:inherit}

.pd-actions{display:grid;gap:10px;margin-bottom:16px}
.pd-btn{border:0;border-radius:var(--btn-radius);padding:13px 20px;min-height:54px;font-size:15.5px;
  line-height:1.25;text-align:center;
  font-weight:700;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:9px;
  transition:transform .12s,filter .16s,box-shadow .16s;font-family:var(--font-btn);
  letter-spacing:var(--btn-ls);text-transform:var(--btn-tt)}
.pd-btn--buy{background:var(--accent);color:var(--accent-ink);box-shadow:var(--btn-shadow)}
.pd-btn--buy:hover{filter:brightness(1.06)}
.pd-btn--buy:active{transform:translateY(1px)}
.pd-btn--cart{background:var(--btn2-bg);color:var(--btn2-ink);border:var(--btn2-border)}
.pd-btn--cart:hover{background:var(--accent-soft)}
.pd-btn--call{background:transparent;color:var(--text);border:1.5px dashed var(--border);min-height:48px;font-size:14.5px;text-decoration:none}
.pd-btn--call:hover{border-color:var(--accent);color:var(--accent-text)}

.pd-trust{list-style:none;margin:0;padding:16px 0 0;border-top:1px solid var(--border);
  display:grid;gap:11px;font-size:13.5px}
.pd-trust li{display:flex;gap:10px;align-items:flex-start;color:var(--muted)}
.pd-trust svg{width:17px;height:17px;flex:none;margin-top:2px;color:var(--accent)}
.pd-trust b{color:var(--text);font-weight:600}

/* ---------- details ---------- */
.pd-details{padding:0 0 60px}
.pd-tabs{display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:26px;
  overflow-x:auto;scrollbar-width:none}
.pd-tabs::-webkit-scrollbar{display:none}
.pd-tab{background:0;border:0;padding:13px 16px;cursor:pointer;font-size:14.5px;font-weight:600;
  color:var(--muted);white-space:nowrap;border-bottom:2px solid transparent;margin-bottom:-1px}
.pd-tab[aria-selected="true"]{color:var(--text);border-bottom-color:var(--accent)}
.pd-panel{max-width:68ch}
.pd-panel p{margin:0 0 15px}
.pd-panel h3{font-family:var(--font-display);font-size:19px;margin:26px 0 10px;font-weight:var(--title-w)}
.pd-list{margin:0;padding:0;list-style:none;display:grid;gap:9px}
.pd-list li{display:flex;gap:10px}
.pd-list li::before{content:"";width:7px;height:7px;margin-top:9px;flex:none;
  background:var(--accent);border-radius:var(--dot-radius)}
.pd-specs{width:100%;border-collapse:collapse;font-size:14.5px;max-width:560px}
.pd-specs th,.pd-specs td{text-align:left;padding:11px 0;border-bottom:1px solid var(--border);vertical-align:top}
.pd-specs th{font-weight:600;width:42%;color:var(--muted)}

/* ---------- sticky bar (mobile) ---------- */
.pd-stickybar{position:fixed;left:0;right:0;bottom:0;z-index:40;background:var(--surface);
  border-top:1px solid var(--border);padding:11px 16px;display:flex;gap:12px;align-items:center;
  transform:translateY(110%);transition:transform .22s ease;box-shadow:0 -8px 28px rgba(0,0,0,.09)}
.pd-stickybar[data-open="true"]{transform:none}
.pd-stickybar .pd-btn{min-height:46px;flex:1;font-size:14.5px;padding:10px 16px}
.pd-stickybar__price{font-family:var(--font-display);font-weight:700;font-size:16px;white-space:nowrap}
.pd-stickybar__price small{display:block;font-size:11.5px;color:var(--muted);font-weight:400;font-family:var(--font-body)}
@media (min-width:980px){.pd-stickybar{display:none}}

.pd-toast{position:fixed;left:50%;bottom:26px;transform:translate(-50%,140%);z-index:60;
  background:var(--toast-bg);color:var(--toast-ink);padding:13px 20px;border-radius:var(--radius-sm);
  font-size:14.5px;box-shadow:0 14px 34px rgba(0,0,0,.24);transition:transform .24s;max-width:90vw}
.pd-toast[data-open="true"]{transform:translate(-50%,0)}
@media (min-width:980px){.pd-toast{bottom:32px}}

.pd-foot{border-top:1px solid var(--border);padding:22px 0 90px;font-size:13px;color:var(--muted)}
@media (min-width:980px){.pd-foot{padding-bottom:30px}}
"""

index_css = """/* ---------- All Themes Master Index ---------- */
@import './base.css';
@import './monochrome.css';
@import './blossom-lavender.css';
@import './phantom.css';
@import './playful-pumpkin.css';
@import './crimson.css';
@import './natural.css';
@import './energetic.css';
@import './tuareg-indigo.css';
@import './neo-brutalist.css';
@import './luxe-noir.css';
"""

target_dirs = [
    os.path.join('platform', 'styles', 'themes'),
    os.path.join('frontend', 'styles', 'themes')
]

for d in target_dirs:
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'base.css'), 'w', encoding='utf-8') as f:
        f.write(base_css)
    with open(os.path.join(d, 'index.css'), 'w', encoding='utf-8') as f:
        f.write(index_css)
    for theme_name, data in themes_data.items():
        theme_content = f"""@import url('{data['font']}');

[data-theme="{theme_name}"] {{
{data['vars']}
}}

{data['overrides']}
"""
        with open(os.path.join(d, f'{theme_name}.css'), 'w', encoding='utf-8') as f:
            f.write(theme_content)

print(f"Generated {len(themes_data)} theme CSS files + base.css + index.css in all directories.")
