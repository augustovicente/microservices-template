import { Request, Response } from 'express';
import { unlink } from 'fs/promises';
import {
  DatabaseClient, Logger, NsqPublisher,
  Topics, DocumentDeletedPayload,
} from '@microservices-template/shared';

export function createDeleteController(db: DatabaseClient, logger: Logger, publisher?: NsqPublisher) {
  return async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const rows = await db.query<Array<{ id: number; storage_path: string }>>(
        'SELECT id, storage_path FROM documents WHERE id = ?',
        [id],
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const doc = rows[0];

      // Remove file from disk
      try { await unlink(doc.storage_path); } catch { /* file may already be gone */ }

      await db.execute('DELETE FROM documents WHERE id = ?', [id]);

      if (publisher) {
        const payload: DocumentDeletedPayload = {
          documentId: doc.id,
          deletedBy: req.body.deletedBy ? Number(req.body.deletedBy) : undefined,
        };
        publisher.publish(Topics.DOCUMENT_DELETED, payload).catch((err) =>
          logger.error({ err }, 'Failed to publish document.deleted'),
        );
      }

      logger.info({ documentId: doc.id }, 'Document deleted');
      res.json({ message: 'Document deleted' });
    } catch (err) {
      logger.error({ err }, 'Delete failed');
      res.status(500).json({ error: 'Delete failed' });
    }
  };
}
