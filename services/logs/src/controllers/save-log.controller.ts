import { Request, Response } from 'express';
import { create_connection } from '../utils/mysql';
import { convertISOToMySQLDatetime } from '../utils/parse';

export const save_log = async (req: Request, res: Response) => {
    const body = req.body;
    console.log('Received log', body);
    if (!body) {
        return res.status(400).send('Missing request body');
    }
    
    const {
        user_id,
        application_name,
        message,
        label,
        code,
        metadata,
    } = req.body;

    if (!application_name || !message || !label || !code || !metadata) {
        return res.status(400).send('Missing required fields');
    }

    try {
        const timestamp = convertISOToMySQLDatetime(new Date());
        const origin = req.headers.origin 
            || req.ip 
            || req.ips.join(',')
            || req.hostname
            || 'unknown';
    
        const conn = await create_connection();
    
        await conn.query(
            'INSERT INTO logs (user_id, application_name, message, label, code, metadata, timestamp, origin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [user_id, application_name, message, label, code, metadata, timestamp, origin]
        );
    
        res.status(201).send('Log saved');
    } catch (error) {
        console.error('Error saving log', error);
        res.status(500).send('Error saving log');
    }
};
