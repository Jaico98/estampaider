package com.estampaider.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public CloudinaryService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    public String subirImagen(MultipartFile file, String folder) {
        try {
            Map<?, ?> upload = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", folder,
                            "resource_type", "image"
                    )
            );

            return upload.get("secure_url").toString();
        } catch (Exception e) {
            throw new RuntimeException("Error subiendo imagen a Cloudinary", e);
        }
    }

    public String subirVideo(MultipartFile file, String folder) {
        try {
            Map<?, ?> upload = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", folder,
                            "resource_type", "video"
                    )
            );

            return upload.get("secure_url").toString();
        } catch (Exception e) {
            throw new RuntimeException("Error subiendo video a Cloudinary", e);
        }
    }
}