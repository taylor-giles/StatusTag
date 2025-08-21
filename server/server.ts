import * as dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { router } from './router';
import * as consoleStamp from 'console-stamp';

const EXPRESS_PORT = parseInt(process.env.EXPRESS_PORT ?? "5000");

//Add timestamps to all logs
consoleStamp.default(console, {
    format: ':date(mm/dd/yy HH:MM:ss):label'
});

//Configure express server
const app = express();

// Enable CORS
//TODO: REMOVE THIS!! It is only here to allow for dev over SSH.
// app.use(cors({
//     origin: '*',
//     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//     allowedHeaders: ['Content-Type', 'Authorization'],
// }));

app.use(express.json());
app.listen(EXPRESS_PORT, () => {
    console.log(`Express server listening on port ${EXPRESS_PORT}.`);
});
app.use('/api', router);