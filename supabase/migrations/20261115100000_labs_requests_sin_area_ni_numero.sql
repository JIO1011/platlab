-- Sin área ni número en la solicitud (docs/05, ADR 0023, «Sin área ni código en la solicitud», 15-11-2026). Quien pide
-- no elige área: se asigna al colocar cada fecha en el Cronograma (labs.activities.area_id). La solicitud se reconoce por
-- su título y su formato y, programada, por el código de práctica de sus bloques: sin el número fijo SOL-0042 ni su
-- contador. Al quitar las columnas se van con ellas su llave foránea, su unicidad y sus permisos de columna.

alter table labs.requests drop column area_id;
alter table labs.requests drop column number;
drop table labs.request_counters;
