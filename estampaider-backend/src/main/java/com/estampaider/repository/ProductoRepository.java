package com.estampaider.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.estampaider.model.Producto;

public interface ProductoRepository extends JpaRepository<Producto, Long> {

    Optional<Producto> findByNombre(String nombre);

    Optional<Producto> findByNombreIgnoreCase(String nombre);

    List<Producto> findByActivoTrueOrderByOrdenAscIdAsc();

    List<Producto> findAllByOrderByOrdenAscIdAsc();
}