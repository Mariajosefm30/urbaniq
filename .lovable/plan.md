
## 1. Reorganización del roster (UI)

En `BoardHome.tsx` tab "Personas y unidades":
- **Importador arriba** como acción principal (colapsable después del primer uso).
- **Una sola tabla agrupada por unidad**, no dos tablas separadas. Cada unidad muestra sus slots de Owner y Tenant:

```text
Unidad 4B                                        [+ Añadir persona]
  Owner    Ana Torres   ana@x.com    activo
  Tenant   —            (vacío)      [Invitar inquilino]
Unidad 5A                                        [+ Añadir persona]
  Owner    (pendiente)  luis@x.com   invitación pendiente  [copiar link]
```

- Se elimina la columna confusa "type" + "status". Queda una sola columna **Rol** con valores `Owner`, `Tenant`, o `Pendiente (Owner)` / `Pendiente (Tenant)`.
- Se puede crear la unidad sola, o crearla implícitamente al invitar (como ya hace el importador).

## 2. Excel unificado

Una sola plantilla. Columnas: `unit, role, name, email, phone`.
- `role` = `owner` | `tenant` (obligatorio, reemplaza el viejo `type`).
- Validación: máximo 1 owner y 1 tenant activo/pendiente por unidad. Fila duplicada = error de fila, no falla el archivo.
- El importador y `roster-bulk-import` se actualizan para usar `role` en vez de `type`.

## 3. Permisos owner vs tenant

Ambos son `role='resident'` en `memberships`, se diferencian por `resident_type`:

| Feature                     | Owner | Tenant |
|-----------------------------|-------|--------|
| Live feed                   | ✅    | ✅     |
| Visitas / guests            | ✅    | ✅     |
| Amenidades / parking        | ✅    | ✅     |
| Tickets de mantenimiento    | ✅    | ✅ (notifica al owner) |
| Ver cargos / pagos          | ✅    | ❌     |
| Invitar tenant de su unidad | ✅    | ❌     |

Se agrega un helper `can_manage_payments(uid, unit_id)` y RLS de `charges` se restringe a owner de la unidad + board.

## 4. Owner invita a su tenant

- Botón "Invitar inquilino" en la vista del owner (`ResidentHome`) y también en el roster del board.
- Edge function `create-invite` acepta ser llamada por un owner autenticado siempre que:
  - El invitado sea `resident_type='tenant'`.
  - `unit_id` sea la unidad del owner.
  - No haya ya un tenant activo/pendiente en esa unidad.

## 5. Notificaciones al owner cuando el tenant crea ticket

**In-app ahora, email después.** Motivo: no hay dominio de correo configurado (dijiste que no querías pagar aún). Cuando conectes un dominio, activamos el envío por email sin tocar la lógica de negocio.

- Nueva tabla `notifications` (id, user_id, building_id, kind, payload jsonb, read_at, created_at) con RLS por `user_id`.
- Trigger en `tickets` AFTER INSERT: si el creador es tenant de una unidad que tiene owner activo, inserta una notificación para el owner con `kind='ticket_created_by_tenant'` y `payload={ticket_id, unit, tenant_name, title}`.
- Campana de notificaciones en el header con contador y lista (marca como leídas al abrir).

## 6. Migraciones

Un solo migration:
1. Reemplaza check constraint de `memberships` para permitir dos residents en la misma unidad si uno es owner y otro tenant, y bloquear dos del mismo tipo.
2. Igual constraint en `invites` pendientes.
3. Crea `notifications` con GRANTs + RLS + trigger.
4. Ajusta RLS de `charges` a "owner de la unidad + board".

## 7. Fuera de este turno
- Envío real de emails (requiere dominio; te aviso el prompt cuando quieras activarlo).
- Notificaciones push móviles.
- Historial de cambios de owner/tenant (por ahora simplemente reasignás el slot).

Confirma y arranco. Si querés recortar algo (p.ej. dejar todo el roster manejado solo por admin_board sin que el owner invite a su tenant), avisá antes.
