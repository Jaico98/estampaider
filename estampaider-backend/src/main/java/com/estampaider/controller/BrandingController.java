package com.estampaider.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/branding")
public class BrandingController {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    private final ObjectMapper objectMapper;

    public BrandingController(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostMapping("/logo")
    public ResponseEntity<Map<String, String>> subirLogo(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(guardarArchivoBranding(file, "logo-estampaider", TipoArchivo.IMAGEN, true));
    }

    @PostMapping("/favicon")
    public ResponseEntity<Map<String, String>> subirFavicon(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(guardarArchivoBranding(file, "favicon-estampaider", TipoArchivo.FAVICON, true));
    }

    @PostMapping("/hero-background")
    public ResponseEntity<Map<String, String>> subirFondoInicio(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(guardarArchivoBranding(file, "hero-background", TipoArchivo.IMAGEN, true));
    }

    @PostMapping("/home-video")
    public ResponseEntity<Map<String, String>> subirVideoHome(
            @RequestParam("file") MultipartFile file,
            @RequestParam("slot") String slot) {

        String nombreBase = resolverSlotVideo(slot);
        return ResponseEntity.ok(guardarArchivoBranding(file, nombreBase, TipoArchivo.VIDEO, true));
    }

    @PostMapping("/gallery-video")
    public ResponseEntity<Map<String, String>> agregarVideoGaleria(@RequestParam("file") MultipartFile file) {
        try {
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(uploadPath);

            int siguienteIndice = obtenerSiguienteIndiceGaleria(uploadPath);
            String nombreBase = "gallery-" + siguienteIndice;

            Map<String, String> response = guardarArchivoBranding(file, nombreBase, TipoArchivo.VIDEO, true);
            response.put("slot", "gallery" + siguienteIndice);
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo preparar la galería");
        }
    }

    @DeleteMapping("/home-video")
    public ResponseEntity<Map<String, String>> eliminarVideoHome(@RequestParam("slot") String slot) {
        String nombreBase = resolverSlotVideo(slot);

        try {
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(uploadPath);
            eliminarVersionesPrevias(uploadPath, nombreBase);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Video eliminado correctamente");
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo eliminar el video");
        }
    }

    @DeleteMapping("/gallery-video")
    public ResponseEntity<Map<String, String>> eliminarVideoGaleria(@RequestParam("slot") String slot) {
        String nombreBase = resolverSlotVideo(slot);

        if (!nombreBase.startsWith("gallery-")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Solo puedes eliminar videos de galería con este endpoint");
        }

        try {
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(uploadPath);
            eliminarVersionesPrevias(uploadPath, nombreBase);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Video de galería eliminado correctamente");
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo eliminar el video de galería");
        }
    }

    @PutMapping("/social-links")
    public ResponseEntity<Map<String, Object>> actualizarRedes(@RequestBody Map<String, String> body) {
        try {
            Map<String, Object> config = leerConfig();
            Map<String, String> socialLinks = new LinkedHashMap<>();

            socialLinks.put("tiktok", limpiarUrl(body.get("tiktok")));
            socialLinks.put("instagram", limpiarUrl(body.get("instagram")));
            socialLinks.put("facebook", limpiarUrl(body.get("facebook")));

            config.put("socialLinks", socialLinks);
            guardarConfig(config);

            Map<String, Object> response = new HashMap<>();
            response.put("socialLinks", socialLinks);
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudieron guardar las redes sociales");
        }
    }

    @GetMapping("/current")
    public ResponseEntity<Map<String, Object>> obtenerBrandingActual() {
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("logoUrl", buscarArchivo(uploadPath, "logo-estampaider", extensionesImagen()));
        response.put("faviconUrl", buscarArchivo(uploadPath, "favicon-estampaider", extensionesFavicon()));
        response.put("heroBackgroundUrl", buscarArchivo(uploadPath, "hero-background", extensionesImagen()));
        response.put("heroMainVideoUrl", buscarArchivo(uploadPath, "hero-main-video", extensionesVideo()));
        response.put("highlightVideoUrl", buscarArchivo(uploadPath, "highlight-video", extensionesVideo()));
        response.put("galleryVideos", obtenerVideosGaleria(uploadPath));

        try {
            Map<String, Object> config = leerConfig();
            Object socialLinks = config.get("socialLinks");

            if (socialLinks instanceof Map<?, ?> map) {
                Map<String, String> redes = new LinkedHashMap<>();

                Object tiktok = map.get("tiktok");
                Object instagram = map.get("instagram");
                Object facebook = map.get("facebook");

                redes.put("tiktok", tiktok != null ? String.valueOf(tiktok) : "");
                redes.put("instagram", instagram != null ? String.valueOf(instagram) : "");
                redes.put("facebook", facebook != null ? String.valueOf(facebook) : "");

                response.put("socialLinks", redes);
            } else {
                response.put("socialLinks", redesVacias());
            }
        } catch (IOException e) {
            response.put("socialLinks", redesVacias());
        }

        return ResponseEntity.ok(response);
    }

    private Map<String, String> guardarArchivoBranding(
            MultipartFile file,
            String nombreBase,
            TipoArchivo tipoArchivo,
            boolean reemplazarPrevios
    ) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debes seleccionar un archivo");
        }

        String contentType = file.getContentType();
        String original = StringUtils.cleanPath(file.getOriginalFilename() == null ? nombreBase : file.getOriginalFilename());
        String extension = obtenerExtension(original);

        validarArchivo(contentType, extension, tipoArchivo);

        try {
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(uploadPath);

            if (reemplazarPrevios) {
                eliminarVersionesPrevias(uploadPath, nombreBase);
            }

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

    private void validarArchivo(String contentType, String extension, TipoArchivo tipoArchivo) {
        if (tipoArchivo == TipoArchivo.IMAGEN) {
            if (contentType == null || !contentType.startsWith("image/")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Solo se permiten imágenes");
            }
            if (!esExtensionPermitida(extension, extensionesImagen())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Formato no permitido. Usa jpg, jpeg, png o webp");
            }
            return;
        }

        if (tipoArchivo == TipoArchivo.FAVICON) {
            if (!esExtensionPermitida(extension, extensionesFavicon())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Formato no permitido. Usa ico, png o svg");
            }
            return;
        }

        if (tipoArchivo == TipoArchivo.VIDEO) {
            boolean contentTypeOk = contentType != null && contentType.startsWith("video/");
            if (!contentTypeOk) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Solo se permiten videos");
            }
            if (!esExtensionPermitida(extension, extensionesVideo())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Formato no permitido. Usa mp4, webm o mov");
            }
        }
    }

    private String resolverSlotVideo(String slot) {
        String valor = slot == null ? "" : slot.trim().toLowerCase();

        if (valor.matches("^gallery\\d+$")) {
            String numero = valor.replace("gallery", "");
            return "gallery-" + numero;
        }

        return switch (valor) {
            case "hero" -> "hero-main-video";
            case "highlight" -> "highlight-video";
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slot de video no válido");
        };
    }

    private int obtenerSiguienteIndiceGaleria(Path uploadPath) throws IOException {
        List<Map<String, String>> actuales = obtenerVideosGaleria(uploadPath);
        int max = 0;

        for (Map<String, String> item : actuales) {
            String slot = item.get("slot");
            if (slot == null) continue;
            if (!slot.startsWith("gallery")) continue;

            try {
                int n = Integer.parseInt(slot.replace("gallery", ""));
                if (n > max) max = n;
            } catch (NumberFormatException ignored) {
            }
        }

        return max + 1;
    }

    private List<Map<String, String>> obtenerVideosGaleria(Path uploadPath) {
        List<Map<String, String>> videos = new ArrayList<>();
        Pattern pattern = Pattern.compile("^gallery-(\\d+)\\.(mp4|webm|mov)$", Pattern.CASE_INSENSITIVE);

        try (DirectoryStream<Path> stream = Files.newDirectoryStream(uploadPath, "gallery-*")) {
            List<Path> archivos = new ArrayList<>();
            for (Path path : stream) {
                archivos.add(path);
            }

            archivos.sort(Comparator.comparingInt(path -> extraerIndiceGaleria(path.getFileName().toString())));

            for (Path path : archivos) {
                String fileName = path.getFileName().toString();
                Matcher matcher = pattern.matcher(fileName);
                if (!matcher.matches()) continue;

                String indice = matcher.group(1);

                Map<String, String> item = new LinkedHashMap<>();
                item.put("slot", "gallery" + indice);
                item.put("url", "/uploads/" + fileName);
                videos.add(item);
            }
        } catch (IOException ignored) {
        }

        return videos;
    }

    private int extraerIndiceGaleria(String fileName) {
        Matcher matcher = Pattern.compile("^gallery-(\\d+)\\.", Pattern.CASE_INSENSITIVE).matcher(fileName);
        if (matcher.find()) {
            try {
                return Integer.parseInt(matcher.group(1));
            } catch (NumberFormatException ignored) {
            }
        }
        return Integer.MAX_VALUE;
    }

    private Map<String, Object> leerConfig() throws IOException {
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(uploadPath);

        Path configPath = uploadPath.resolve("branding-settings.json").normalize();
        if (!Files.exists(configPath)) {
            return new LinkedHashMap<>();
        }

        return objectMapper.readValue(
                Files.readString(configPath),
                new TypeReference<LinkedHashMap<String, Object>>() {}
        );
    }

    private void guardarConfig(Map<String, Object> config) throws IOException {
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(uploadPath);

        Path configPath = uploadPath.resolve("branding-settings.json").normalize();
        Files.writeString(
                configPath,
                objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(config),
                StandardOpenOption.CREATE,
                StandardOpenOption.TRUNCATE_EXISTING
        );
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
        String[] extensiones = {"png", "jpg", "jpeg", "webp", "ico", "svg", "mp4", "webm", "mov"};

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

    private boolean esExtensionPermitida(String extension, String[] permitidas) {
        for (String ext : permitidas) {
            if (ext.equals(extension)) {
                return true;
            }
        }
        return false;
    }

    private String limpiarUrl(String url) {
        String valor = url == null ? "" : url.trim();
        if (valor.isBlank()) return "";
        if (valor.startsWith("http://") || valor.startsWith("https://")) {
            return valor;
        }
        return "";
    }

    private Map<String, String> redesVacias() {
        Map<String, String> vacias = new LinkedHashMap<>();
        vacias.put("tiktok", "");
        vacias.put("instagram", "");
        vacias.put("facebook", "");
        return vacias;
    }

    private String[] extensionesImagen() {
        return new String[]{"png", "webp", "jpg", "jpeg"};
    }

    private String[] extensionesFavicon() {
        return new String[]{"ico", "png", "svg"};
    }

    private String[] extensionesVideo() {
        return new String[]{"mp4", "webm", "mov"};
    }

    private enum TipoArchivo {
        IMAGEN,
        FAVICON,
        VIDEO
    }
}