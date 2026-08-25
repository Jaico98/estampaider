package com.estampaider.controller;

import com.estampaider.model.BrandingConfig;
import com.estampaider.model.BrandingGaleria;
import com.estampaider.model.BrandingRed;
import com.estampaider.repository.BrandingConfigRepository;
import com.estampaider.repository.BrandingGaleriaRepository;
import com.estampaider.repository.BrandingRedRepository;
import com.estampaider.service.CloudinaryService;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/branding")
public class BrandingController {

    private static final Pattern GALLERY_SLOT_PATTERN =
            Pattern.compile("^gallery(\\d+)$", Pattern.CASE_INSENSITIVE);

    private final CloudinaryService cloudinaryService;
    private final BrandingConfigRepository brandingRepository;
    private final BrandingGaleriaRepository galeriaRepository;
    private final BrandingRedRepository redesRepository;

    public BrandingController(
            CloudinaryService cloudinaryService,
            BrandingConfigRepository brandingRepository,
            BrandingGaleriaRepository galeriaRepository,
            BrandingRedRepository redesRepository) {
        this.cloudinaryService = cloudinaryService;
        this.brandingRepository = brandingRepository;
        this.galeriaRepository = galeriaRepository;
        this.redesRepository = redesRepository;
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
            @RequestParam("slot") String slot) {
        validarArchivo(file, TipoArchivo.VIDEO);
        String valor = slot == null ? "" : slot.trim().toLowerCase();
        if (!valor.equals("hero") && !valor.equals("highlight")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slot de video no válido");
        }

        BrandingConfig config = obtenerConfig();
        String url = cloudinaryService.subirVideo(file, "estampaider/branding/videos");
        if (valor.equals("hero")) config.setHeroMainVideoUrl(url);
        else config.setHighlightVideoUrl(url);
        brandingRepository.save(config);

        return ResponseEntity.ok(new LinkedHashMap<>(Map.of("url", url, "slot", valor)));
    }

    @PostMapping("/gallery-video")
    public ResponseEntity<Map<String, Object>> agregarVideoGaleria(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "slot", required = false) String slot) {
        validarArchivo(file, TipoArchivo.VIDEO);
        String slotFinal = normalizarSlotGaleria(slot);
        if (slotFinal.isBlank()) slotFinal = obtenerPrimerSlotLibre(leerGaleria());

        String url = cloudinaryService.subirVideo(file, "estampaider/branding/gallery");
        BrandingGaleria item = galeriaRepository.findByTipoIgnoreCase(slotFinal).orElseGet(BrandingGaleria::new);
        item.setTipo(slotFinal);
        item.setUrl(url);
        item.setOrden(obtenerIndiceGaleria(slotFinal));
        item.setActivo(true);
        galeriaRepository.save(item);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("url", url);
        response.put("slot", slotFinal);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/home-video")
    public ResponseEntity<Map<String, Object>> eliminarVideoHome(@RequestParam("slot") String slot) {
        String valor = slot == null ? "" : slot.trim().toLowerCase();
        BrandingConfig config = obtenerConfig();
        if (valor.equals("hero")) config.setHeroMainVideoUrl("");
        else if (valor.equals("highlight")) config.setHighlightVideoUrl("");
        else throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slot de video no válido");
        brandingRepository.save(config);
        return ResponseEntity.ok(Map.of("message", "Video eliminado correctamente"));
    }

    @DeleteMapping("/gallery-video")
    public ResponseEntity<Map<String, Object>> eliminarVideoGaleria(@RequestParam("slot") String slot) {
        String slotFinal = normalizarSlotGaleria(slot);
        if (slotFinal.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slot de galería inválido");
        }
        galeriaRepository.findByTipoIgnoreCase(slotFinal).ifPresent(item -> {
            item.setActivo(false);
            galeriaRepository.save(item);
        });
        return ResponseEntity.ok(Map.of("message", "Video de galería eliminado correctamente"));
    }

    @PutMapping("/social-links")
    public ResponseEntity<Map<String, Object>> actualizarRedes(@RequestBody Map<String, String> body) {
        String[] nombres = {"tiktok", "instagram", "facebook"};
        for (int i = 0; i < nombres.length; i++) {
            String red = nombres[i];
            String url = limpiarUrl(body.get(red));
            BrandingRed item = redesRepository.findByRedIgnoreCase(red).orElseGet(BrandingRed::new);
            item.setRed(red);
            item.setUrl(url);
            item.setOrden(i + 1);
            item.setActivo(!url.isBlank());
            redesRepository.save(item);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("socialLinks", leerRedes());
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
        response.put("galleryVideos", leerGaleria());
        response.put("socialLinks", leerRedes());
        return ResponseEntity.ok(response);
    }

    private BrandingConfig obtenerConfig() {
        return brandingRepository.findById(1L).orElseGet(() -> {
            BrandingConfig config = new BrandingConfig();
            config.setId(1L);
            return brandingRepository.save(config);
        });
    }

    private List<Map<String, String>> leerGaleria() {
        List<Map<String, String>> resultado = new ArrayList<>();
        for (BrandingGaleria item : galeriaRepository.findAllByActivoTrueOrderByOrdenAscIdAsc()) {
            Map<String, String> fila = new LinkedHashMap<>();
            fila.put("slot", item.getTipo());
            fila.put("url", item.getUrl());
            resultado.add(fila);
        }
        return resultado;
    }

    private Map<String, String> leerRedes() {
        Map<String, String> resultado = redesVacias();
        for (BrandingRed item : redesRepository.findAllByActivoTrueOrderByOrdenAscIdAsc()) {
            if (resultado.containsKey(item.getRed().toLowerCase())) {
                resultado.put(item.getRed().toLowerCase(), textoSeguro(item.getUrl()));
            }
        }
        return resultado;
    }

    private String obtenerPrimerSlotLibre(List<Map<String, String>> galeria) {
        Set<Integer> ocupados = new HashSet<>();
        for (Map<String, String> item : galeria) {
            int indice = obtenerIndiceGaleria(item.get("slot"));
            if (indice > 0) ocupados.add(indice);
        }
        int i = 1;
        while (ocupados.contains(i)) i++;
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
        try { return Integer.parseInt(matcher.group(1)); }
        catch (NumberFormatException e) { return Integer.MAX_VALUE; }
    }

    private void validarArchivo(MultipartFile file, TipoArchivo tipoArchivo) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debes seleccionar un archivo");
        }
        String contentType = file.getContentType();
        String original = StringUtils.cleanPath(file.getOriginalFilename() == null
                ? "archivo" : file.getOriginalFilename());
        String extension = obtenerExtension(original);

        if (tipoArchivo == TipoArchivo.IMAGEN) {
            if (contentType == null || !contentType.startsWith("image/")
                    || !esExtensionPermitida(extension, new String[] {"png", "webp", "jpg", "jpeg"})) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Formato no permitido. Usa jpg, jpeg, png o webp");
            }
        } else if (tipoArchivo == TipoArchivo.FAVICON) {
            if (!esExtensionPermitida(extension, new String[] {"ico", "png", "svg"})) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Formato no permitido. Usa ico, png o svg");
            }
        } else if (contentType == null || !contentType.startsWith("video/")
                || !esExtensionPermitida(extension, new String[] {"mp4", "webm", "mov"})) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Formato no permitido. Usa mp4, webm o mov");
        }
    }

    private String obtenerExtension(String nombreArchivo) {
        int punto = nombreArchivo.lastIndexOf('.');
        return punto == -1 || punto == nombreArchivo.length() - 1
                ? "" : nombreArchivo.substring(punto + 1).toLowerCase();
    }

    private boolean esExtensionPermitida(String extension, String[] permitidas) {
        for (String ext : permitidas) if (ext.equals(extension)) return true;
        return false;
    }

    private String limpiarUrl(String url) {
        String valor = url == null ? "" : url.trim();
        return valor.startsWith("http://") || valor.startsWith("https://") ? valor : "";
    }

    private String textoSeguro(String valor) { return valor == null ? "" : valor.trim(); }

    private Map<String, String> redesVacias() {
        Map<String, String> vacias = new LinkedHashMap<>();
        vacias.put("tiktok", "");
        vacias.put("instagram", "");
        vacias.put("facebook", "");
        return vacias;
    }

    private enum TipoArchivo { IMAGEN, FAVICON, VIDEO }
}
