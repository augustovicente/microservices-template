import express from 'express';
import { requestLoggerMiddleware, registry } from './middleware/prometheus';
import cors from 'cors';
import { save_log } from './controllers/save-log.controller';

const app = express()

app.use(express.json()); 
app.use(cors());
app.use(requestLoggerMiddleware);

app.get('/ping', function (req, res) {
    res.send('pong');
})
app.post('/logs', save_log);

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send(await registry.metrics());
});

const server = app.listen(3000)

export {
    app,
    server,
}