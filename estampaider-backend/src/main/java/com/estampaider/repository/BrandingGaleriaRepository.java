package com.estampaider.repository;

import com.estampaider.model.BrandingGaleria;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BrandingGaleriaRepository extends JpaRepository<BrandingGaleria, Long> {
    List<BrandingGaleria> findAllByActivoTrueOrderByOrdenAscIdAsc();
    java.util.Optional<BrandingGaleria> findByTipoIgnoreCase(String tipo);
}
