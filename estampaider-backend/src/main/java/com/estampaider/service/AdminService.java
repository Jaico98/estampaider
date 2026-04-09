package com.estampaider.service;

import com.estampaider.model.Admin;
import com.estampaider.repository.AdminRepository;
import org.springframework.stereotype.Service;

@Service
public class AdminService {

    private final AdminRepository adminRepository;

    public AdminService(AdminRepository adminRepository) {
        this.adminRepository = adminRepository;
    }

    public boolean login(String usuario, String password) {
        return adminRepository.findByUsuario(usuario)
                .map(admin -> admin.getPassword().equals(password))
                .orElse(false);
    }
}
