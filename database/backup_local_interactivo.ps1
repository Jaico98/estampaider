# Ejecutar desde PowerShell. No almacena ni recibe la contraseña como argumento.
$ErrorActionPreference = 'Stop'
$clienteDump = 'C:\Users\jaico\mysql-client-tools\client\bin\mysqldump.exe'
if (-not (Test-Path -LiteralPath $clienteDump)) { throw 'Falta instalar el cliente MySQL.' }
$carpetaRespaldo = Join-Path 'C:\Users\jaico\estampaider-backups' ('pre-chat-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Path $carpetaRespaldo | Out-Null
$permisos = Get-Acl -LiteralPath $carpetaRespaldo
$permisos.SetAccessRuleProtection($true, $false)
$identidad = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
$regla = New-Object System.Security.AccessControl.FileSystemAccessRule($identidad, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
$permisos.AddAccessRule($regla)
Set-Acl -LiteralPath $carpetaRespaldo -AclObject $permisos
$archivoParcial = Join-Path $carpetaRespaldo 'estampaider.sql.partial'
$archivoFinal = Join-Path $carpetaRespaldo 'estampaider.sql'
Write-Host 'Introduce la contraseña de MySQL de Railway cuando aparezca Enter password. No se mostrará al escribir.'
& $clienteDump --no-defaults --host=shinkansen.proxy.rlwy.net --port=22421 --user=root --password --ssl-mode=REQUIRED --single-transaction --quick --routines --events --triggers --hex-blob --no-tablespaces --set-gtid-purged=OFF "--result-file=$archivoParcial" railway
if ($LASTEXITCODE -ne 0) { throw "El respaldo no terminó. Archivo parcial conservado en $archivoParcial; no usarlo para restaurar." }
if ((Get-Item -LiteralPath $archivoParcial).Length -eq 0) { throw 'El respaldo está vacío.' }
Move-Item -LiteralPath $archivoParcial -Destination $archivoFinal
Get-Item -LiteralPath $archivoFinal | Select-Object FullName, Length
Get-FileHash -LiteralPath $archivoFinal -Algorithm SHA256
Write-Host 'Exportación completada. Falta verificar la restauración de este archivo antes de migrar producción. No subir el respaldo a GitHub.'
