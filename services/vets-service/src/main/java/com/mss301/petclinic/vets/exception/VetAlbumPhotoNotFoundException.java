package com.mss301.petclinic.vets.exception;

import com.mss301.petclinic.common.web.exception.ResourceNotFoundException;

public class VetAlbumPhotoNotFoundException extends ResourceNotFoundException {

    private static final long serialVersionUID = 1L;

    public VetAlbumPhotoNotFoundException(String id) {
        super("VetAlbumPhoto", id);
    }
}
