package com.mss301.petclinic.vets.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.mss301.petclinic.vets.client.FilesClient;
import com.mss301.petclinic.vets.client.FilesClient.FileObjectResponse;
import com.mss301.petclinic.vets.config.StorageCleanupProperties;
import com.mss301.petclinic.vets.repository.VetAlbumPhotoRepository;
import com.mss301.petclinic.vets.repository.VetPhotoRepository;
import com.mss301.petclinic.vets.service.impl.FileOrphanCleanupJob.CleanupReport;

class FileOrphanCleanupJobTest {

    private FilesClient files;
    private VetPhotoRepository photoRepository;
    private VetAlbumPhotoRepository albumRepository;
    private FileOrphanCleanupJob job;

    @BeforeEach
    void setUp() {
        files = mock(FilesClient.class);
        photoRepository = mock(VetPhotoRepository.class);
        albumRepository = mock(VetAlbumPhotoRepository.class);
        job = new FileOrphanCleanupJob(
                files,
                photoRepository,
                albumRepository,
                new StorageCleanupProperties(true, false, "0 0 3 * * *", Duration.ZERO));
    }

    @Test
    void runCleanup_mixedValidAndOrphan_onlyOrphanDeleted() {
        when(photoRepository.findAllObjectKeys()).thenReturn(List.of("vets/photo/1"));
        when(albumRepository.findAllObjectKeys()).thenReturn(List.of());
        when(files.list("vets/photo/")).thenReturn(List.of(
                object("vets/photo/1"),
                object("vets/photo/2")));
        when(files.list("vets/album/")).thenReturn(List.of(object("vets/album/2/3")));

        CleanupReport report = job.runCleanup();

        assertThat(report.photoOrphans()).isEqualTo(1);
        assertThat(report.albumOrphans()).isEqualTo(1);
        assertThat(report.total()).isEqualTo(2);
        verify(files).delete("vets/photo/2");
        verify(files).delete("vets/album/2/3");
    }

    @Test
    void runCleanup_emptyBucket_zeroOrphans() {
        when(photoRepository.findAllObjectKeys()).thenReturn(List.of());
        when(albumRepository.findAllObjectKeys()).thenReturn(List.of());
        when(files.list("vets/photo/")).thenReturn(List.of());
        when(files.list("vets/album/")).thenReturn(List.of());

        CleanupReport report = job.runCleanup();

        assertThat(report.total()).isZero();
        verify(files).list("vets/photo/");
        verify(files).list("vets/album/");
        verifyNoMoreInteractions(files);
    }

    private static FileObjectResponse object(String key) {
        return new FileObjectResponse(key, Instant.EPOCH, 10L);
    }
}
