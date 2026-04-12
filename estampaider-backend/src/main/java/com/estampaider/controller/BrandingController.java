package com.estampaider.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.*;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/branding")
public class BrandingController {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @PostMapping("/logo")
    public ResponseEntity<Map<String, String>> subirLogo(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(guardarArchivoBranding(file, "logo-estampaider", true));
    }

    @PostMapping("/favicon")
    public ResponseEntity<Map<String, String>> subirFavicon(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(guardarArchivoBranding(file, "favicon-estampaider", false));
    }

    @GetMapping("/current")
    public ResponseEntity<Map<String, String>> obtenerBrandingActual() {
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();

        Map<String, String> response = new HashMap<>();
        response.put("logoUrl", buscarArchivo(uploadPath, "logo-estampaider", new String[]{"png", "webp", "jpg", "jpeg"}));
        response.put("faviconUrl", buscarArchivo(uploadPath, "favicon-estampaider", new String[]{"ico", "png", "svg"}));

        return ResponseEntity.ok(response);
    }

    private Map<String, String> guardarArchivoBranding(MultipartFile file, String nombreBase, boolean soloImagen) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debes seleccionar un archivo");
        }

        String contentType = file.getContentType();
        String original = StringUtils.cleanPath(file.getOriginalFilename() == null ? nombreBase : file.getOriginalFilename());
        String extension = obtenerExtension(original);

        if (soloImagen) {
            if (contentType == null || !contentType.startsWith("image/")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Solo se permiten imágenes");
            }

            if (!esExtensionImagenPermitida(extension)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Formato no permitido. Usa jpg, jpeg, png o webp");
            }
        } else {
            if (!esExtensionFaviconPermitida(extension)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Formato no permitido. Usa ico, png o svg");
            }
        }

        try {
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(uploadPath);

            eliminarVersionesPrevias(uploadPath, nombreBase);

            String fileName = nombreBase + "." + extension;
            Path destino = uploadPath.resolve(fileName).normalize();

            Files.copy(file.getInputStream(), destino, StandardCopyOption.REPLACE_EXISTING);

            Map<String, String> response = new HashMap<>();
            response.put("url", "/uploads/" + fileName);
            return response;

        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo guardar el archivo");
        }
    }

    private String buscarArchivo(Path uploadPath, String nombreBase, String[] extensiones) {
        for (String ext : extensiones) {
            Path archivo = uploadPath.resolve(nombreBase + "." + ext).normalize();
            if (Files.exists(archivo)) {
                return "/uploads/" + nombreBase + "." + ext;
            }
        }
        return "";
    }

    private void eliminarVersionesPrevias(Path uploadPath, String nombreBase) throws IOException {
        String[] extensiones = {"png", "jpg", "jpeg", "webp", "ico", "svg"};

        for (String ext : extensiones) {
            Path archivo = uploadPath.resolve(nombreBase + "." + ext).normalize();
            Files.deleteIfExists(archivo);
        }
    }

    private String obtenerExtension(String nombreArchivo) {
        int punto = nombreArchivo.lastIndexOf('.');
        if (punto == -1 || punto == nombreArchivo.length() - 1) {
            return "";
        }
        return nombreArchivo.substring(punto + 1).toLowerCase();
    }

    private boolean esExtensionImagenPermitida(String extension) {
        return extension.equals("jpg")
            || extension.equals("jpeg")
            || extension.equals("png")
            || extension.equals("webp");
    }

    private boolean esExtensionFaviconPermitida(String extension) {
        return extension.equals("ico")
            || extension.equals("png")
            || extension.equals("svg");
    }
}