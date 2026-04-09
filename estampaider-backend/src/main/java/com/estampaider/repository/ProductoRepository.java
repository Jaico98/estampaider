package com.estampaider.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.estampaider.model.Producto;

public interface ProductoRepository extends JpaRepository<Producto, Long> {

    Optional<Producto> findByNombre(String nombre);
    Producto findByNombreIgnoreCase(String nombre);
}
