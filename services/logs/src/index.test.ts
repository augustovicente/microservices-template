import request from 'supertest';
import { app, server } from './index';
import * as CONN from './utils/mysql';

describe('logs-service', () => {
    describe('save-log-endpoint', () => {
        it('returns 201 for a successful request', async () => {
            const mock = jest.spyOn(CONN, 'create_connection');
            mock.mockImplementation(() => {
                return new Promise((resolve, reject) => {
                    resolve({
                        query: () => {
                            return new Promise((resolve, reject) => {
                                resolve({
                                    insertId: 1
                                });
                            });
                        },
                        end: () => {}
                    });
                }) as any;
            });

            const response = await request(app).post('/logs').send({
                user_id: 1,
                application_name: "OPA",
                message: "OPA",
                label: "OPA",
                code: "500",
                metadata: "OPAAA"
            });

            expect(response.status).toBe(201);
        });

        it('returns 404 for a request to an unknown endpoint', async () => {
            const response = await request(app).get('/unknown');

            expect(response.status).toBe(404);
        });
        
        it('returns 400 for a request with missing parameters', async () => {
            const response = await request(app).post('/logs').send({
                user_id: 1,
                application_name: "OPA",
                message: "OPA",
                label: "OPA",
                code: "500",
            });

            expect(response.status).toBe(400);
        });

        it('close the server', async () => {
            server.close();
        });
    });
});