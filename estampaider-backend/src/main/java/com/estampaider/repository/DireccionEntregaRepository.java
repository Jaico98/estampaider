package com.estampaider.repository;

import com.estampaider.model.DireccionEntrega;
import com.estampaider.model.Usuario;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DireccionEntregaRepository extends JpaRepository<DireccionEntrega, Long> {
    Optional<DireccionEntrega> findFirstByUsuarioAndDireccionAndCiudadAndDepartamentoAndBarrioAndReferencia(
        Usuario usuario, String direccion, String ciudad, String departamento, String barrio, String referencia);
}
