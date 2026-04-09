package com.estampaider.repository;

import com.estampaider.model.Mensaje;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MensajeRepository extends JpaRepository<Mensaje, Long> {

    long countByLeidoFalse();
}

