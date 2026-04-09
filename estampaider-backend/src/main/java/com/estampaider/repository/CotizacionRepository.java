package com.estampaider.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.estampaider.model.Cotizacion;

public interface CotizacionRepository extends JpaRepository<Cotizacion, Long> {
}