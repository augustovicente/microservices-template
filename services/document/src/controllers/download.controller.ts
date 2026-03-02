import { Request, Response } from 'express';
import { resolve } from 'path';
import { DatabaseClient, Logger } from '@microservices-template/shared';

export function createDownloadController(db: DatabaseClient, logger: Logger) {
  return async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const rows = await db.query<Array<{ original_name: string; mime_type: string; storage_path: string }>>(
        'SELECT original_name, mime_type, storage_path FROM documents WHERE id = ?',
        [id],
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const doc = rows[0];
      res.setHeader('Content-Type', doc.mime_type);
      res.setHeader('Content-Disposition', `attachment; filename="${doc.original_name}"`);
      res.sendFile(resolve(doc.storage_path));
    } catch (err) {
      logger.error({ err }, 'Download failed');
      res.status(500).json({ error: 'Download failed' });
    }
  };
}
