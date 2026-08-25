package com.estampaider.repository;

import com.estampaider.model.Talla;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TallaRepository extends JpaRepository<Talla, Long> {
    Optional<Talla> findByNombreIgnoreCase(String nombre);
}
