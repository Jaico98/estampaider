package com.estampaider.repository;

import com.estampaider.model.MetodoPago;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MetodoPagoRepository extends JpaRepository<MetodoPago, Long> {

    List<MetodoPago> findByActivoTrue();

    Optional<MetodoPago> findByNombreIgnoreCase(String nombre);
}
