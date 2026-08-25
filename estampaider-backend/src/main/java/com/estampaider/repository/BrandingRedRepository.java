package com.estampaider.repository;

import com.estampaider.model.BrandingRed;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BrandingRedRepository extends JpaRepository<BrandingRed, Long> {
    List<BrandingRed> findAllByActivoTrueOrderByOrdenAscIdAsc();
    java.util.Optional<BrandingRed> findByRedIgnoreCase(String red);
}
