package com.estampaider.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.estampaider.model.Pedido;

public interface PedidoRepository extends JpaRepository<Pedido, Long> {

    /**
     * Buscar pedidos por estado
     */
    List<Pedido> findByEstado(String estado);

    List<Pedido> findByUsuario_TelefonoOrderByFechaDesc(String telefono);
}


