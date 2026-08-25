# Scripts de base de datos de Estampaider

Estos archivos documentan el esquema relacional objetivo en tercera forma normal y la transición desde el esquema heredado.

## Archivos

- `01_schema_3fn.sql`: crea las 18 tablas del esquema 3FN objetivo y, al final, dos tablas auxiliares para conservar el chat y las cotizaciones heredadas que todavía utiliza el backend de WhatsApp.
- `02_migrate_legacy_to_3fn.sql`: copia datos del esquema anterior hacia las estructuras normalizadas y conserva las columnas heredadas durante la transición.
- `03_verify_3fn.sql`: verifica tablas, conteos, relaciones y registros que no pudieron ser asociados.

## Orden de trabajo

1. Crear un respaldo de la base de datos.
2. Ejecutar primero los scripts sobre una copia o una base de pruebas.
3. Ejecutar `01_schema_3fn.sql` y después `02_migrate_legacy_to_3fn.sql`.
4. Revisar todos los casos reportados por `03_verify_3fn.sql`.
5. Confirmar que el backend de este repositorio ya esté actualizado y compilado antes de agregar las restricciones finales o retirar columnas heredadas.
6. Repetir las pruebas funcionales y de integración.

La migración no debe ejecutarse directamente sobre Railway sin respaldo y sin revisar los resultados de `03_verify_3fn.sql`. Las entidades, repositorios y servicios del backend ya fueron alineados con las tablas normalizadas; las columnas heredadas se conservan para permitir una transición verificable. El archivo `01_schema_3fn.sql` contempla que `usuarios.usuario` sea opcional y único cuando exista, debido al formulario público real de registro.
