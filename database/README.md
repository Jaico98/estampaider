# Scripts de base de datos de Estampaider

Estos archivos documentan el esquema relacional objetivo en tercera forma normal y la transición desde el esquema heredado.

## Archivos

- `01_schema_3fn.sql`: crea las 18 tablas del esquema objetivo en una base nueva. Sobre una base heredada crea únicamente las tablas nuevas que todavía no existan.
- `02_migrate_legacy_to_3fn.sql`: copia datos del esquema anterior hacia las estructuras normalizadas y conserva las columnas heredadas durante la transición.
- `03_verify_3fn.sql`: verifica tablas, conteos, relaciones y registros que no pudieron ser asociados.

## Orden de trabajo

1. Crear un respaldo de la base de datos.
2. Ejecutar primero los scripts sobre una copia o una base de pruebas.
3. Ejecutar `01_schema_3fn.sql` y después `02_migrate_legacy_to_3fn.sql`.
4. Revisar todos los casos reportados por `03_verify_3fn.sql`.
5. Actualizar y compilar el backend antes de agregar las restricciones finales o retirar columnas heredadas.
6. Repetir las pruebas funcionales y de integración.

La migración no debe ejecutarse directamente sobre Railway mientras las entidades JPA, los repositorios y los servicios del backend sigan utilizando el esquema anterior. El archivo `01_schema_3fn.sql` contempla que `usuarios.usuario` sea opcional y único cuando exista, debido al formulario público real de registro.
