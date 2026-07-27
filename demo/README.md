# Jardín Demo — Camino

Demo interactivo del generador de SVG del jardín de Camino. Permite modificar todas las variables que afectan la generación del jardín y ver los cambios en tiempo real.

## Variables disponibles

### 🧬 DNA Traits (rasgos permanentes del jardín)
- **Terrain** — tipo de terreno: bosque, pradera, colina, monástico, mediterráneo
- **Path Shape** — forma del camino: recto, curvo, espiral, cruz, círculo
- **Tree Species** — especie del árbol central: olivo, cedro, ciprés, roble, sauce
- **Rock Pattern** — patrón de rocas (0–3)
- **River Angle** — ángulo del río/estanque (0–359)
- **Palette** — variante cromática (A/B/C)
- **Flower Bias** — sesgo de especie floral (rosas, lirios, variado)
- **Signature Seed** — seed del glifo de la placa

### 📊 Garden State (estado dinámico)
- **Rosaries / Novenas / Coronillas** — conteo de devociones
- **Waterings / Seeds / Silence** — recursos y práctica
- **Streak / Community** — perseverancia y oración comunitaria
- **Water Level / Light Level** — niveles de agua y luz (0–100)
- **Health** — salud del jardín (0–1)
- **Level** — nivel de madurez (0–10)
- **Growth Phase** — fase de crecimiento (1–3)
- **Season** — estación litúrgica
- **Show Dove / Show Deer** — fauna visible
- **Consolidated Rosal** — rosal consolidado
- **Watering Effect Strength** — efecto del riego (0–1)

### 🎬 Interaction (interacción puntual)
- **Show Rain** — animación de lluvia
- **Just Watered** — efecto de riego reciente

## Cómo ejecutar

### Opción 1: Abrir directamente
Abre `demo/index.html` en cualquier navegador moderno. No requiere servidor.

### Opción 2: Servidor local (recomendado)
Desde la raíz del proyecto:

```bash
# Con Python 3
python -m http.server 8080 --directory demo

# O con Node.js (npx)
npx serve demo

# O con PHP
php -S localhost:8080 -t demo
```

Luego abre `http://localhost:8080` en el navegador.

### Opción 3: Desde la raíz del proyecto Camino
El proyecto ya tiene Vite configurado. Puedes agregar una ruta adicional o simplemente abrir el archivo directamente.

## Tecnología
- HTML5 + CSS3 + Vanilla JavaScript
- Sin dependencias externas
- Sin build step requerido
- SVG generado dinámicamente
- Algoritmos fieles al código fuente de `src/garden/`