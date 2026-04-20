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
import java.text.Normalizer;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/uploads")
public class UploadController {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @PostMapping("/producto")
    public ResponseEntity<Map<String, String>> subirImagenProducto(
            @RequestParam("file") MultipartFile file) {

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debes seleccionar una imagen");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Solo se permiten archivos de imagen");
        }

        String nombreOriginal = StringUtils.cleanPath(
            file.getOriginalFilename() == null ? "imagen" : file.getOriginalFilename()
        );
        String extension = obtenerExtension(nombreOriginal);

        if (!esExtensionPermitida(extension)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Formato no permitido. Usa jpg, jpeg, png o webp"
            );
        }

        long maxBytes = 10 * 1024 * 1024; // 10 MB
        if (file.getSize() > maxBytes) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "La imagen supera el tamaño máximo de 10 MB"
            );
        }

        try {
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(uploadPath);

            String nombreBase = limpiarNombre(nombreOriginal.replace("." + extension, ""));
            String nombreArchivo = nombreBase + "-" + UUID.randomUUID().toString().substring(0, 8) + "." + extension;

            Path destino = uploadPath.resolve(nombreArchivo).normalize();

            if (!destino.startsWith(uploadPath)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ruta de archivo inválida");
            }

            Files.copy(file.getInputStream(), destino, StandardCopyOption.REPLACE_EXISTING);

            Map<String, String> response = new HashMap<>();
            response.put("fileName", nombreArchivo);
            response.put("url", "/uploads/" + nombreArchivo);

            return ResponseEntity.ok(response);

        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo guardar la imagen");
        }
    }

    private String obtenerExtension(String nombreArchivo) {
        int punto = nombreArchivo.lastIndexOf('.');
        if (punto == -1 || punto == nombreArchivo.length() - 1) {
            return "";
        }
        return nombreArchivo.substring(punto + 1).toLowerCase();
    }

    private boolean esExtensionPermitida(String extension) {
        return extension.equals("jpg")
            || extension.equals("jpeg")
            || extension.equals("png")
            || extension.equals("webp");
    }

    private String limpiarNombre(String texto) {
        String limpio = Normalizer.normalize(texto, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .replaceAll("[^a-zA-Z0-9-_]", "-")
            .replaceAll("-{2,}", "-")
            .replaceAll("^-|-$", "")
            .toLowerCase();

        return limpio.isBlank() ? "imagen-producto" : limpio;
    }
}