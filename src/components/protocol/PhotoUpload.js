/**
 * Photo Upload Component für Cleaning Step Dokumentation
 * Ermöglicht das Hinzufügen von Fotos zu Reinigungsschritten
 */

import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Image, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import s3StorageService from '../../services/s3StorageService';
import './PhotoUpload.css';

function PhotoUpload({
  logId,
  stepId,
  tenantId,
  existingPhotos = [],
  onPhotosUpdate,
  maxPhotos = 5,
  maxSizeMB = 10,
}) {
  const [photos, setPhotos] = useState(existingPhotos);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  /**
   * Datei-Validierung
   */
  const validateFile = file => {
    // Dateigröße prüfen
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `Datei zu groß. Maximum: ${maxSizeMB}MB`;
    }

    // Dateityp prüfen
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return 'Nur JPEG, PNG und WebP Dateien sind erlaubt';
    }

    return null;
  };

  /**
   * Foto-Upload verarbeiten
   */
  const handlePhotoUpload = async files => {
    if (!files || files.length === 0) return;

    if (photos.length + files.length > maxPhotos) {
      setError(`Maximum ${maxPhotos} Fotos pro Schritt erlaubt`);
      return;
    }

    setUploading(true);
    setError('');

    const newPhotos = [];

    try {
      for (const file of Array.from(files)) {
        // Validierung
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          continue;
        }

        // Bildmetadaten extrahieren
        const metadata = await extractImageMetadata(file);

        // Zu Buffer konvertieren
        const buffer = await fileToBuffer(file);

        // Upload zu S3
        const uploadResult = await s3StorageService.uploadStepPhoto(
          tenantId,
          logId,
          stepId,
          buffer,
          {
            content_type: file.type,
            width: metadata.width,
            height: metadata.height,
            original_name: file.name,
          }
        );

        // In Database speichern
        const { data: photoRecord, error: dbError } = await supabase
          .from('step_photos')
          .insert({
            log_id: logId,
            step_id: stepId,
            photo_id: uploadResult.photo_id,
            s3_key: uploadResult.s3_key,
            filename: file.name,
            content_type: file.type,
            size_bytes: file.size,
            width: metadata.width,
            height: metadata.height,
            sha256: uploadResult.sha256,
            uploaded_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (dbError) {
          console.error('Database error:', dbError);
          throw new Error('Fehler beim Speichern in Database');
        }

        // Thumbnail für Anzeige erstellen
        const thumbnail = await createThumbnail(file);

        newPhotos.push({
          ...photoRecord,
          thumbnail,
          uploading: false,
        });
      }

      const updatedPhotos = [...photos, ...newPhotos];
      setPhotos(updatedPhotos);

      if (onPhotosUpdate) {
        onPhotosUpdate(updatedPhotos);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(`Upload fehlgeschlagen: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  /**
   * Foto löschen
   */
  const handlePhotoDelete = async photoId => {
    try {
      // Aus Database löschen
      const { error } = await supabase.from('step_photos').delete().eq('photo_id', photoId);

      if (error) throw error;

      // Aus State entfernen
      const updatedPhotos = photos.filter(photo => photo.photo_id !== photoId);
      setPhotos(updatedPhotos);

      if (onPhotosUpdate) {
        onPhotosUpdate(updatedPhotos);
      }

      // S3 Cleanup (optional - wird durch Cleanup-Job erledigt)
      // await s3StorageService.deleteFile(s3Key);
    } catch (error) {
      console.error('Delete error:', error);
      setError(`Löschen fehlgeschlagen: ${error.message}`);
    }
  };

  /**
   * Drag & Drop Handler
   */
  const handleDrop = e => {
    e.preventDefault();
    setDragOver(false);

    const files = e.dataTransfer.files;
    handlePhotoUpload(files);
  };

  const handleDragOver = e => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = e => {
    e.preventDefault();
    setDragOver(false);
  };

  /**
   * Utility Functions
   */
  const fileToBuffer = file => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(Buffer.from(reader.result));
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const extractImageMetadata = file => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const createThumbnail = file => {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const maxSize = 150;
        const ratio = Math.min(maxSize / img.width, maxSize / img.height);

        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const formatFileSize = bytes => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="photo-upload">
      <div className="photo-upload__header">
        <h4 className="photo-upload__title">
          <Image size={18} />
          Fotos hinzufügen ({photos.length}/{maxPhotos})
        </h4>
      </div>

      {/* Error Display */}
      {error && (
        <div className="photo-upload__error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Upload Area */}
      {photos.length < maxPhotos && (
        <div
          className={`photo-upload__dropzone ${dragOver ? 'dragover' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <div className="photo-upload__uploading">
              <div className="spinner"></div>
              <span>Fotos werden hochgeladen...</span>
            </div>
          ) : (
            <div className="photo-upload__prompt">
              <Upload size={32} />
              <span>Fotos hier ablegen oder klicken zum Auswählen</span>
              <small>JPEG, PNG, WebP • Max. {maxSizeMB}MB pro Datei</small>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="photo-upload__actions">
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || photos.length >= maxPhotos}
        >
          <Upload size={16} />
          Datei auswählen
        </button>

        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading || photos.length >= maxPhotos}
        >
          <Camera size={16} />
          Kamera
        </button>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        onChange={e => handlePhotoUpload(e.target.files)}
        style={{ display: 'none' }}
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={e => handlePhotoUpload(e.target.files)}
        style={{ display: 'none' }}
      />

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="photo-upload__grid">
          {photos.map((photo, index) => (
            <div key={photo.photo_id || index} className="photo-upload__item">
              {photo.thumbnail ? (
                <img
                  src={photo.thumbnail}
                  alt={photo.filename}
                  className="photo-upload__thumbnail"
                />
              ) : (
                <div className="photo-upload__placeholder">
                  <Image size={24} />
                </div>
              )}

              <div className="photo-upload__info">
                <span className="photo-upload__filename">{photo.filename}</span>
                <span className="photo-upload__size">{formatFileSize(photo.size_bytes)}</span>
                {photo.width && photo.height && (
                  <span className="photo-upload__dimensions">
                    {photo.width} × {photo.height}
                  </span>
                )}
              </div>

              <button
                type="button"
                className="photo-upload__delete"
                onClick={() => handlePhotoDelete(photo.photo_id)}
                title="Foto löschen"
              >
                <X size={16} />
              </button>

              {photo.uploading !== false && (
                <div className="photo-upload__status">
                  <Check size={16} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Photo Count Info */}
      {photos.length > 0 && (
        <div className="photo-upload__summary">
          {photos.length} Foto{photos.length !== 1 ? 's' : ''} hinzugefügt
          {photos.length >= maxPhotos && (
            <span className="photo-upload__limit">• Maximum erreicht</span>
          )}
        </div>
      )}
    </div>
  );
}

export default PhotoUpload;
