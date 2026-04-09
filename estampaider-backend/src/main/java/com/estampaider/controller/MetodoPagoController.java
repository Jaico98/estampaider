package com.estampaider.controller;

import com.estampaider.model.MetodoPago;
import com.estampaider.repository.MetodoPagoRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/metodos-pago")
@CrossOrigin
public class MetodoPagoController {

    private final MetodoPagoRepository repo;

    public MetodoPagoController(MetodoPagoRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<MetodoPago> obtenerMetodos() {
        return repo.findByActivoTrue();
    }
}
