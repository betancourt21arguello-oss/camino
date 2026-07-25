# Plan: Arquitectura del Módulo Jardín SVG

## 1. Contexto actual

- `garden_events` es append-only, solo INSERT/SELECT por usuario (RLS).
- RPC existentes llamadas desde frontend: `record_spiritual_event`, `water_garden`, `gift_candle`, `ensure_daily_spiritual_tasks`.
- Los RPC viven en Supabase; en el repo no hay `.sql` local.
- `GardenState` se agrega desde `garden_events` en `src/garden/events.ts:20-63`.
- SVG actual (`src/garden/GardenSvg.tsx`) usa `dna` + `state` deterministicamente; no hay niveles ni decay visual.

## 2. Objetivo

Agregar sin romper:
1. Decaimiento visual por sequía (efecto en SVG/CSS puro, sin mutar historial).
2. Riego en bulk (consume todo el `agua` disponible en un clic).
3. Corrección admin (inserción de eventos compensatorios).
4. Progresión SVG modular infinita basada en niveles.

## 3. Decisiones de diseño

### 3.1 Sequía por oración — `H_efectiva`

**Cálculo:**
- `H_efectiva = clamp(1 - elapsed_hours / 48, 0, 1)` donde `elapsed_hours` es horas desde `lastGrowth` (último evento).
- Si `elapsed_hours > 24h`, la sequía es visible; a las 48h, `H_efectiva = 0`.
- No se escribe en DB. Se calcula en el cliente en `aggregateGardenState` como campo derivado `health`.

**Aplicación visual (sin tocar datos):**
- En `GardenSvg`, recibir `health: number` (0..1) y aplicar:
  - `filter: saturate(${0.3 + 0.7 * health})` sobre el grupo principal `<g>`.
  - `opacity: ${0.6 + 0.4 * health}` sobre luces/flores/particulas.
  - Si `health < 0.3`, overlay de tons pardos translúcidos simulando sequía.
- `AmbientSky` (fondo) también recibe `health` para atenuar brillos.

**Cambios mínimos:**
- `src/garden/types.ts`: agregar `health: number` a `GardenState`.
- `src/garden/events.ts`: calcular `health` en `aggregateGardenState` usando `Date.now() - lastGrowth`.
- `src/garden/GardenSvg.tsx`: recibir `health`, aplicar filtros CSS.

### 3.2 Riego en bulk — RPC `bulk_water_garden`

**Comportamiento:**
- Lee el saldo actual de `agua` desde `fruits`.
- Inserta UN SOLO evento `WATER_GARDEN` con `value = saldo_agua`.
- Descarga TODO el `agua` a 0 en la misma transacción.
- Devuelve: `{ watered: true, amount: number, new_water_level: number }`.

**SQL objetivo:**
```sql
create or replace function bulk_water_garden(p_user_id uuid, p_intention text)
returns table(watered boolean, amount int, new_water_level int)
language plpgsql
security definer
as $$
declare
  v_agua int;
begin
  select agua into v_agua from fruits where profile_id = p_user_id for update;
  if v_agua is null or v_agua <= 0 then
    watered := false; amount := 0; new_water_level := 0; return next;
    return;
  end if;
  insert into garden_events(user_id, event_type, value, intention)
    values (p_user_id, 'WATER_GARDEN', v_agua, p_intention);
  update fruits set agua = 0, updated_at = now() where profile_id = p_user_id;
  watered := true; amount := v_agua;
  -- recalcular nivel simbólico (misma lógica que el frontend)
  new_water_level := least(100, v_agua * 8);
  return next;
end;
$$;
```

**Frontend:**
- `src/fruits/store.tsx`: nueva función `bulkWaterGarden(intention)` que llama a `supabase.rpc("bulk_water_garden", ...)`.
- Actualiza `balance.agua = 0`, append evento local, recarga Realtime.
- UI: en `PerfilScreen.tsx` cambiar botón a "🌊 Regar todo" cuando `agua > 1`, mostrando cantidad a regar.

### 3.3 Corrección admin — inserción compensatoria

**Cambios en `AdminPortal.tsx` (`GardenEditor`):**
- Agregar formulario inline: `event_type` (select), `value` (number), `intention` (text opcional).
- Botón "Insertar evento compensatorio" que ejecuta:
  ```ts
  supabase.from("garden_events").insert({
    user_id: userId,
    event_type,
    value: Number(value),
    intention: intention || null,
    created_at: new Date().toISOString(), // solo permitido por service_role/admin
  });
  ```
- Nota: el frontend normal con RLS no puede setear `created_at` pasado; para correcciones históricas usar SQL directo o service_role. El admin panel debe advertir que las correcciones históricas requieren SQL directo.
- Quitar el texto viejo que dice que no se puede editar.

### 3.4 Progresión SVG infinita — niveles modulares

**Niveles:**
```ts
const Level = Math.floor(Math.log10(totalPuntos + 1)); // 0..N
```
- `totalPuntos` = suma ponderada de eventos relevantes (ej: rosary=10, novena=30, coronilla=15, watering=2, silence_min/10=1, etc).

**Arquitectura modular:**
- `src/garden/levels/`:
  - `index.ts`: exporta `resolveLevel(state) → LevelConfig`.
  - `registry.ts`: `LEVEL_REGISTRY: Record<number, LevelModule>`.
  - `types.ts`: `LevelConfig` (incrementos por nivel: densidad flores, luces, partículas, capas árbol, mariposas).
  - `module.ts`: componente `LevelModule({ config, dna, state })` renderiza additions del nivel.
- Cada nivel agrega capas, no reemplaza. `Level 0` = base actual; `Level N` agrega `N` capas.
- Ejemplo capas:
  - Nivel 3+: flores extra + hierba densa.
  - Nivel 5+: luces flotantes + rayos.
  - Nivel 8+: mariposas + partículas doradas.
  - Nivel 12+: río visible + piedras luminosas.

**Cambios en `generateGardenModel`:**
- Recibir `level: number`.
- Para cada capa modular, multiplicar counts por factor según nivel.
- Mantener deterministicidad: usar `dna` + `state.totalRosaries` etc, no `Math.random()`.

**Cambios en `aggregateGardenState`:**
- Calcular `pointsScore` ponderado y `level` y agregarlos a `GardenState`.

## 4. Orden de implementación

1. **Sequía visual** (change-only):
   - `types.ts`: agregar `health: number`, `lastGrowth: number`.
   - `events.ts`: calcular `health` desde `lastGrowth`.
   - `GardenSvg.tsx`: recibir `health`, aplicar `filter` y opacidad.
2. **Bulk watering**:
   - SQL `bulk_water_garden` en Supabase.
   - `store.tsx`: `bulkWaterGarden`.
   - UI: botón en Perfil.
3. **Admin correction**:
   - `AdminPortal.tsx`: formulario de inserción + nota sobre service_role.
4. **Progresión infinita**:
   - `garden/levels/`: tipos + registry + módulo base.
   - `model.ts`: integrar `level` en `buildWildGarden`.
   - `events.ts`: calcular `pointsScore` y `level`.

## 5. Validación

- Verificar que al pasar de 24h sin eventos, el SVG aplica `saturate(0.35)` y opacidad reducida.
- Verificar que `bulk_water_garden` consume todo el `agua` y solo inserta 1 row.
- Verificar que admin puede insertar eventos compensatorios.
- Verificar que `Level` crece con el log10 de puntos y que SVG escala sin número mágico.

## 6. Riesgos

- **Performance**: `aggregateGardenState` actual lee todos los eventos; agregar `health`/`level` es O(1) adicional, sin riesgo.
- **CSS filters**: `filter: saturate()` en SVG puede ser costoso en mobile; limitar a grupos, no al `<svg>` entero.
- **Bulk RPC**: requiere `security definer` y validación `auth.uid() = p_user_id`.
- **Admin historical inserts**: RLS prohíbe `created_at` pasado; para admin, usar service_role o endpoint del Worker.

## 7. Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/garden/types.ts` | +`health`, `lastGrowth`, `pointsScore`, `level` en GardenState |
| `src/garden/events.ts` | Calcular `health` desde `lastGrowth`; calcular `pointsScore` y `level` |
| `src/garden/GardenSvg.tsx` | Props `health`, `level`; filtros CSS conditionales |
| `src/garden/model.ts` | `generateGardenModel` usa `level` para counts modulares |
| `src/garden/levels/*` | Nuevo: registry de niveles modulares |
| `src/fruits/store.tsx` | +`bulkWaterGarden` |
| `src/screens/PerfilScreen.tsx` | Botón bulk watering |
| `src/screens/AdminPortal.tsx` | Formulario inserción compensatoria |
| `worker/src/index.ts` | (Opcional) endpoint admin si se requiere service_role |
