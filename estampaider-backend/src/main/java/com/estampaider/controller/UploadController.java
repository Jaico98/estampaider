package com.estampaider.controller;

import com.estampaider.service.CloudinaryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/uploads")
public class UploadController {

    private final CloudinaryService cloudinaryService;

    public UploadController(CloudinaryService cloudinaryService) {
        this.cloudinaryService = cloudinaryService;
    }

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

        long maxBytes = 10 * 1024 * 1024;
        if (file.getSize() > maxBytes) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "La imagen supera el tamaño máximo de 10 MB"
            );
        }

        String url = cloudinaryService.subirImagen(file, "estampaider/productos");

        Map<String, String> response = new HashMap<>();
        response.put("fileName", limpiarNombre(nombreOriginal));
        response.put("url", url);

        return ResponseEntity.ok(response);
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
            .replaceAll("[^a-zA-Z0-9-_\\.]", "-")
            .replaceAll("-{2,}", "-")
            .replaceAll("^-|-$", "")
            .toLowerCase();

        return limpio.isBlank() ? "imagen-producto" : limpio;
    }
}