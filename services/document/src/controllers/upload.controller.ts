import { Request, Response } from 'express';
import {
  DatabaseClient, Logger, NsqPublisher,
  Topics, DocumentUploadedPayload,
} from '@microservices-template/shared';

export function createUploadController(db: DatabaseClient, logger: Logger, publisher?: NsqPublisher) {
  return async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const result = await db.execute<{ insertId: number }>(
        'INSERT INTO documents (filename, original_name, mime_type, size_bytes, storage_path, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
        [file.filename, file.originalname, file.mimetype, file.size, file.path, req.body.uploadedBy || null],
      );

      const documentId = result.insertId;

      if (publisher) {
        const payload: DocumentUploadedPayload = {
          documentId,
          filename: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          uploadedBy: req.body.uploadedBy ? Number(req.body.uploadedBy) : undefined,
        };
        publisher.publish(Topics.DOCUMENT_UPLOADED, payload).catch((err) =>
          logger.error({ err }, 'Failed to publish document.uploaded'),
        );
      }

      logger.info({ documentId, filename: file.originalname }, 'Document uploaded');
      res.status(201).json({ documentId, filename: file.originalname, size: file.size });
    } catch (err) {
      logger.error({ err }, 'Upload failed');
      res.status(500).json({ error: 'Upload failed' });
    }
  };
}
