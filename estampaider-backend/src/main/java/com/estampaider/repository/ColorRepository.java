package com.estampaider.repository;

import com.estampaider.model.Color;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ColorRepository extends JpaRepository<Color, Long> {
    Optional<Color> findByNombreIgnoreCase(String nombre);
}
