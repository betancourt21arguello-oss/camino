# Plan: reemplazo del módulo Jardín por @nuevojardin

## Objetivo
Sustituir la implementación del jardín SVG (`src/garden/`) por la versión de `nuevojardin`, manteniendo intactos los consumers externos no-jardín (Regla, Rosario, Comunidad, auth, navegación).

## Límites estrictos
- **Tocar únicamente**: `src/garden/**`, `src/fruits/**` (tips/events), `src/screens/PerfilScreen.tsx` (solo integración de jardín).
- **NO tocar**: `src/screens/ReglaScreen.tsx`, `src/screens/RosarioScreen.tsx`, `src/screens/ComunidadScreen.tsx`, `src/auth/`, `src/components/BottomNav.tsx`, `src/lib/`, `src/utils/`.

---

## Fase 1 — Reemplazo completo del núcleo del jardín
Copiar/reescribir estos archivos desde `nuevojardin/src/garden/` a `src/garden/`:
1. `types.ts` 2. `prng.ts` 3. `dna.ts` 4. `model.ts` 5. `fractal.ts` 6. `flowers.ts` 7. `events.ts` 8. `time.ts` 9. `personal.ts` 10. `GardenSvg.tsx` 11. `GardenFullscreen.tsx` 12. `levels/types.ts` 13. `levels/registry.ts` 14. `levels/module.tsx` 15. `levels/index.ts`

Nota: `fractal.ts`, `flowers.ts`, `time.ts`, `personal.ts` son byte-identical; incluirlos para garantizar integridad.

---

## Fase 2 — Actualizar `fruits/` (sistema de eventos → jardín)
Objetivo: alinear tipos de eventos y estado para que alimenten al nuevo `aggregateGardenState`.

1. **`src/fruits/types.ts`**: reemplazar con la versión de nuevojardin.  
   Cambios esperados: `SpiritualEvent.value?` (opcional), nuevos event types, `FruitMeta` nuevo, `Candle` con `owner_id`/`lit_at`/`expires_at`.
2. **`src/fruits/rewards.ts`**: reemplazar con versión de nuevojardin (nuevos eventos, `applyReward`).
3. **`src/fruits/store.tsx`**: reemplazar con versión de nuevojardin.  
   Cambios clave: funciones async (`lightCandle`, `prayForCandle`, `waterGarden`, `bulkWaterGarden`), estado `justWatered`/`loading`, tabla BD `fruit_history`, mejor cleanup de realtime.

---

## Fase 3 — Ajuste mínimo de `PerfilScreen.tsx`
Cambiar únicamente la sección del tab Jardín:
- Pasar `personal={personalInput}` a `<GardenSvg>` y `<GardenFullscreen>`.
- Actualizar imports: añadir `GardenFullscreen`, `levelTitle`, `SHRINE_LABEL`, `TERRAIN_LABEL`, `TREE_LABEL`, `MATURITY_LABEL`, `SEASON_LABEL`, `TIME_LABEL`, `TIME_ICON`, `derivePersonalTraits`, `SPECIES_LABEL`, `PersonalInput`.
- Expandir stats a 9 ítems (añadir streak, commits, totalWaterings).
- Render badge `Nv. {level} · {levelTitle(state.level)}`.
- Actualizar `MilestoneAccordion` para usar `m.detail`.
- Limpiar cualquier referencia a `communityPrayer` (renombrado a `commits`).
- Mantener intactos los tabs restantes y la estructura del layout.

---

## Fase 4 — Verificación de schemas BD (riesgo Supabase)
Si el proyecto está en producción con tablas existentes, verificar:
- ¿Tabla `fruit_history` existe, o requiere migración?
- ¿Campos `owner_id` / `lit_at` / `expires_at` en `candles` existen, o hay que mapear desde `ownerName`/`ownerHue`/`litAt`/`expiresAt`?
- ¿Tabla `garden_events` usa `value INT` o admite NULL?

Si hay migración pendiente, documentar el SQL aquí:
```sql
-- TODO_supabase_migration
```

---

## Criterios de validación
1. App compila sin errores de tipos.
2. Pestaña **Perfil → Jardín** renderiza el SVG con parámetros de usuario.
3. Riego (`waterGarden`) activa lluvia + rizo (+ `justWatered` 6s).
4. Datos烘: `milestones`, `maturityTier`, `timeOfDay`, `growthPhase` aparecen en UI.
5. Pantalla completa (`GardenFullscreen`) funciona y recibe `personal`.
6. Resto de tabs se abren y funcionan igual.

## Riesgos
- **Supabase schema drift**: si la BD actual no coincide, `fruits/store.tsx` rompe. Mitigar revisando migraciones antes de deploy.
- **Bundle size**: `GardenSvg.tsx` pasa de ~1171 a 816 líneas, pero `prng` crece +50%. Sin impacto adverso esperado.

## Orden de ejecución por comando
```powershell
# 1) Backup git
git checkout -b feat/replace-garden-module
# 2) Reemplazar garden core
Copy-Item nuevojardin\src\garden\* src\garden\ -Recurse -Force
# 3) Reemplazar fruits module
Copy-Item nuevojardin\src\fruits\* src\fruits\ -Recurse -Force
# 4) Editar PerfilScreen manualmente (Fase 3)
# 5) npm run build && npm run dev
```
