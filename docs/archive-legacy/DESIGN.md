# DESIGN.md — Apple Style System (SiTransparan RT/RW Portal)

Reference: [Apple Design Reference](https://styles.refero.design/style/aecac5da-f397-4ddf-b71f-de1efc434cb8)  
Theme: **White room with a single blue switch (Light Theme)**  
Tone: Architectural clarity, generous whitespace, restraint, supreme legibility.

---

## 1. Color Palette & Surfaces (Semantic Tokens)

### Clean Light Surfaces
- **Frost (`#f5f5f7`)**: Page canvas, body backgrounds, footer surface — signature Apple light gray.
- **Pure White (`#ffffff`)**: Card surfaces, modal containers, navbar background with blur.
- **Ice (`#f4f8fb`)**: Subtle blue-tinted section washes, tag backings.
- **Pebble (`#e2e2e5`)**: Disabled button fills, subtle segment backings.

### Ink & Typography Colors
- **Carbon (`#1d1d1f`)**: Primary heading and body ink — near-black with warmth.
- **Smoke (`#333333`)**: Secondary text, icons, strong borders.
- **Graphite (`#474747`)**: Subhead labels, tertiary text.
- **Ash (`#707070`)**: Footer text, dates, secondary metadata, helper copy.
- **Hairline Border (`#d2d2d7`)**: Standard card and input border (1px).

### The Blue Switch Accents
- **Apple Blue (`#0071e3`)**: Filled primary action button — the only chromatic interactive fill.
- **Link Blue (`#0066cc`)**: Outlined action border, interactive text links.
- **Signal Blue (`#2997ff`)**: Subtle decorative badge highlights.

---

## 2. Typography & Scale

- **Display & Headings**: Negative letter-spacing (`-0.01em` to `-0.02em`), clean geometric weight 600 max.
- **Body copy**: 15–17px, Carbon `#1d1d1f`, leading 1.47, letter-spacing `-0.016em`.
- **Subheads & Descriptors**: Weight 300 / 400 for signature calm whisper.

---

## 3. Shape & Elevation Rules (Do's & Don'ts)

### Do
1. Use **980px border-radius (`rounded-full`)** for every interactive button, tag, and status pill.
2. Use **8px border-radius (`rounded-lg`)** for cards, images, and inputs.
3. Use `#0071e3` (Apple Blue) filled pill exclusively for the primary CTA, paired with an outlined `#0066cc` pill for secondary.
4. Build depth through surface contrast (`#ffffff` card on `#f5f5f7` canvas) and 1px `#d2d2d7` hairline border, never heavy shadows.

### Don't
1. Never use dark canvas or black background for normal pages.
2. Never add heavy drop shadows.
3. Never use sharp square buttons (980px pill is non-negotiable).
4. Never use #0071e3 for background fills other than primary action buttons.
