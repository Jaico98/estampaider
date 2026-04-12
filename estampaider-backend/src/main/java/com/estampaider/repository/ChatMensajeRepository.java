package com.estampaider.repository;

import com.estampaider.model.ChatMensaje;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMensajeRepository extends JpaRepository<ChatMensaje, String> {

    List<ChatMensaje> findByTelefonoOrderByFechaAsc(String telefono);
}