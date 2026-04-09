package com.estampaider.repository;

import com.estampaider.model.ChatMensaje;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMensajeRepository extends JpaRepository<ChatMensaje, Long> {

    List<ChatMensaje> findByTelefonoOrderByFechaAsc(String telefono);
}