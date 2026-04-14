package com.estampaider.repository;

import com.estampaider.model.Mensaje;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MensajeRepository extends JpaRepository<Mensaje, Long> {

    long countByLeidoFalse();

    Optional<Mensaje> findFirstByWhatsappOrderByFechaDesc(String whatsapp);

    List<Mensaje> findByWhatsapp(String whatsapp);
}

