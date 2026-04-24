package com.estampaider.controller;

import com.estampaider.model.BrandingConfig;
import com.estampaider.repository.BrandingConfigRepository;
import com.estampaider.service.CloudinaryService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/branding")
public class BrandingController {

    private static final Pattern GALLERY_SLOT_PATTERN =
            Pattern.compile("^gallery(\\d+)$", Pattern.CASE_INSENSITIVE);

    private final ObjectMapper objectMapper;
    private final CloudinaryService cloudinaryService;
    private final BrandingConfigRepository brandingRepository;

    public BrandingController(
            ObjectMapper objectMapper,
            CloudinaryService cloudinaryService,
            BrandingConfigRepository brandingRepository
    ) {
        this.objectMapper = objectMapper;
        this.cloudinaryService = cloudinaryService;
        this.brandingRepository = brandingRepository;
    }

    @PostMapping("/logo")
    public ResponseEntity<Map<String, Object>> subirLogo(@RequestParam("file") MultipartFile file) {
        validarArchivo(file, TipoArchivo.IMAGEN);
        BrandingConfig config = obtenerConfig();

        String url = cloudinaryService.subirImagen(file, "estampaider/branding/logo");
        config.setLogoUrl(url);
        brandingRepository.save(config);

        return ResponseEntity.ok(Map.of("url", url));
    }

    @PostMapping("/favicon")
    public ResponseEntity<Map<String, Object>> subirFavicon(@RequestParam("file") MultipartFile file) {
        validarArchivo(file, TipoArchivo.FAVICON);
        BrandingConfig config = obtenerConfig();

        String url = cloudinaryService.subirImagen(file, "estampaider/branding/favicon");
        config.setFaviconUrl(url);
        brandingRepository.save(config);

        return ResponseEntity.ok(Map.of("url", url));
    }

    @PostMapping("/hero-background")
    public ResponseEntity<Map<String, Object>> subirFondoInicio(@RequestParam("file") MultipartFile file) {
        validarArchivo(file, TipoArchivo.IMAGEN);
        BrandingConfig config = obtenerConfig();

        String url = cloudinaryService.subirImagen(file, "estampaider/branding/backgrounds");
        config.setHeroBackgroundUrl(url);
        brandingRepository.save(config);

        return ResponseEntity.ok(Map.of("url", url));
    }

    @PostMapping("/home-video")
    public ResponseEntity<Map<String, Object>> subirVideoHome(
            @RequestParam("file") MultipartFile file,
            @RequestParam("slot") String slot
    ) {
        validarArchivo(file, TipoArchivo.VIDEO);

        String valor = slot == null ? "" : slot.trim().toLowerCase();
        if (!valor.equals("hero") && !valor.equals("highlight")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slot de video no válido");
        }

        BrandingConfig config = obtenerConfig();
        String url = cloudinaryService.subirVideo(file, "estampaider/branding/videos");

        if (valor.equals("hero")) {
            config.setHeroMainVideoUrl(url);
        } else {
            config.setHighlightVideoUrl(url);
        }

        brandingRepository.save(config);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("url", url);
        response.put("slot", valor);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/gallery-video")
    public ResponseEntity<Map<String, Object>> agregarVideoGaleria(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "slot", required = false) String slot
    ) {
        validarArchivo(file, TipoArchivo.VIDEO);

        BrandingConfig config = obtenerConfig();
        List<Map<String, String>> galeria = leerGaleria(config);

        String slotCalculado = normalizarSlotGaleria(slot);
        if (slotCalculado.isBlank()) {
            slotCalculado = obtenerPrimerSlotLibre(galeria);
        }
        final String slotFinal = slotCalculado;
        String url = cloudinaryService.subirVideo(file, "estampaider/branding/gallery");
        galeria.removeIf(item -> slotFinal.equalsIgnoreCase(item.get("slot")));

        Map<String, String> item = new LinkedHashMap<>();
        item.put("slot", slotFinal);
        item.put("url", url);
        galeria.add(item);

        galeria.sort(Comparator.comparingInt(v -> obtenerIndiceGaleria(v.get("slot"))));

        guardarGaleria(config, galeria);
        brandingRepository.save(config);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("url", url);
        response.put("slot", slotFinal);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/home-video")
    public ResponseEntity<Map<String, Object>> eliminarVideoHome(@RequestParam("slot") String slot) {
        String valor = slot == null ? "" : slot.trim().toLowerCase();

        BrandingConfig config = obtenerConfig();

        if (valor.equals("hero")) {
            config.setHeroMainVideoUrl("");
        } else if (valor.equals("highlight")) {
            config.setHighlightVideoUrl("");
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slot de video no válido");
        }

        brandingRepository.save(config);
        return ResponseEntity.ok(Map.of("message", "Video eliminado correctamente"));
    }

    @DeleteMapping("/gallery-video")
    public ResponseEntity<Map<String, Object>> eliminarVideoGaleria(@RequestParam("slot") String slot) {
        String slotFinal = normalizarSlotGaleria(slot);

        if (slotFinal.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slot de galería inválido");
        }

        BrandingConfig config = obtenerConfig();
        List<Map<String, String>> galeria = leerGaleria(config);

        galeria.removeIf(item -> slotFinal.equalsIgnoreCase(item.get("slot")));

        guardarGaleria(config, galeria);
        brandingRepository.save(config);

        return ResponseEntity.ok(Map.of("message", "Video de galería eliminado correctamente"));
    }

    @PutMapping("/social-links")
    public ResponseEntity<Map<String, Object>> actualizarRedes(@RequestBody Map<String, String> body) {
        BrandingConfig config = obtenerConfig();

        Map<String, String> socialLinks = new LinkedHashMap<>();
        socialLinks.put("tiktok", limpiarUrl(body.get("tiktok")));
        socialLinks.put("instagram", limpiarUrl(body.get("instagram")));
        socialLinks.put("facebook", limpiarUrl(body.get("facebook")));

        try {
            config.setSocialLinksJson(objectMapper.writeValueAsString(socialLinks));
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudieron guardar las redes");
        }

        brandingRepository.save(config);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("socialLinks", socialLinks);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/current")
    public ResponseEntity<Map<String, Object>> obtenerBrandingActual() {
        BrandingConfig config = obtenerConfig();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("logoUrl", textoSeguro(config.getLogoUrl()));
        response.put("faviconUrl", textoSeguro(config.getFaviconUrl()));
        response.put("heroBackgroundUrl", textoSeguro(config.getHeroBackgroundUrl()));
        response.put("heroMainVideoUrl", textoSeguro(config.getHeroMainVideoUrl()));
        response.put("highlightVideoUrl", textoSeguro(config.getHighlightVideoUrl()));
        response.put("galleryVideos", leerGaleria(config));
        response.put("socialLinks", leerRedes(config));

        return ResponseEntity.ok(response);
    }

    private BrandingConfig obtenerConfig() {
        return brandingRepository.findById(1L).orElseGet(() -> {
            BrandingConfig config = new BrandingConfig();
            config.setId(1L);
            config.setGalleryVideosJson("[]");
            config.setSocialLinksJson("{}");
            return brandingRepository.save(config);
        });
    }

    private List<Map<String, String>> leerGaleria(BrandingConfig config) {
        try {
            String raw = config.getGalleryVideosJson();
            if (raw == null || raw.isBlank()) return new ArrayList<>();

            return objectMapper.readValue(
                    raw,
                    new TypeReference<List<Map<String, String>>>() {}
            );
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private void guardarGaleria(BrandingConfig config, List<Map<String, String>> galeria) {
        try {
            config.setGalleryVideosJson(objectMapper.writeValueAsString(galeria));
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo guardar galería");
        }
    }

    private Map<String, String> leerRedes(BrandingConfig config) {
        try {
            String raw = config.getSocialLinksJson();
            if (raw == null || raw.isBlank()) return redesVacias();

            Map<String, String> redes = objectMapper.readValue(
                    raw,
                    new TypeReference<Map<String, String>>() {}
            );

            Map<String, String> normalizadas = redesVacias();
            normalizadas.put("tiktok", textoSeguro(redes.get("tiktok")));
            normalizadas.put("instagram", textoSeguro(redes.get("instagram")));
            normalizadas.put("facebook", textoSeguro(redes.get("facebook")));

            return normalizadas;
        } catch (Exception e) {
            return redesVacias();
        }
    }

    private String obtenerPrimerSlotLibre(List<Map<String, String>> galeria) {
        Set<Integer> ocupados = new HashSet<>();

        for (Map<String, String> item : galeria) {
            int indice = obtenerIndiceGaleria(item.get("slot"));
            if (indice > 0) ocupados.add(indice);
        }

        int i = 1;
        while (ocupados.contains(i)) {
            i++;
        }

        return "gallery" + i;
    }

    private String normalizarSlotGaleria(String slot) {
        String valor = slot == null ? "" : slot.trim().toLowerCase();
        if (valor.isBlank() || valor.equals("new")) return "";

        Matcher matcher = GALLERY_SLOT_PATTERN.matcher(valor);

        if (!matcher.matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slot de galería inválido");
        }

        int indice = Integer.parseInt(matcher.group(1));
        if (indice < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slot de galería inválido");
        }

        return "gallery" + indice;
    }

    private int obtenerIndiceGaleria(String slot) {
        Matcher matcher = GALLERY_SLOT_PATTERN.matcher(String.valueOf(slot));
        if (!matcher.matches()) return Integer.MAX_VALUE;

        try {
            return Integer.parseInt(matcher.group(1));
        } catch (NumberFormatException e) {
            return Integer.MAX_VALUE;
        }
    }

    private void validarArchivo(MultipartFile file, TipoArchivo tipoArchivo) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debes seleccionar un archivo");
        }

        String contentType = file.getContentType();
        String original = StringUtils.cleanPath(
                file.getOriginalFilename() == null ? "archivo" : file.getOriginalFilename()
        );
        String extension = obtenerExtension(original);

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

    private String obtenerExtension(String nombreArchivo) {
        int punto = nombreArchivo.lastIndexOf('.');
        if (punto == -1 || punto == nombreArchivo.length() - 1) {
            return "";
        }
        return nombreArchivo.substring(punto + 1).toLowerCase();
    }

    private boolean esExtensionPermitida(String extension, String[] permitidas) {
        for (String ext : permitidas) {
            if (ext.equals(extension)) return true;
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

    private String textoSeguro(String valor) {
        return valor == null ? "" : valor.trim();
    }

    private Map<String, String> redesVacias() {
        Map<String, String> vacias = new LinkedHashMap<>();
        vacias.put("tiktok", "");
        vacias.put("instagram", "");
        vacias.put("facebook", "");
        return vacias;
    }

    private String[] extensionesImagen() {
        return new String[] {"png", "webp", "jpg", "jpeg"};
    }

    private String[] extensionesFavicon() {
        return new String[] {"ico", "png", "svg"};
    }

    private String[] extensionesVideo() {
        return new String[] {"mp4", "webm", "mov"};
    }

    private enum TipoArchivo {
        IMAGEN,
        FAVICON,
        VIDEO
    }
}
